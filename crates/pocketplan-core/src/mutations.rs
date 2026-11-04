use crate::*;
use serde_json::{json, Value};
use std::collections::HashSet;

pub fn migrate(mut data: Value) -> Result<Value> {
    validate(&data)?;
    if data["schemaVersion"] != 3 {
        let old = |id: &str| matches!(id, "main" | "savings" | "cash");
        let mut wallets = initial()["wallets"].as_array().unwrap().clone();
        wallets[0]["balance"] = money(
            list(&data, "wallets")
                .iter()
                .filter(|w| old(text(w, "id")))
                .map(|w| cents(&w["balance"]))
                .sum(),
        );
        for mut wallet in list(&data, "wallets")
            .iter()
            .filter(|w| !old(text(w, "id")))
            .cloned()
        {
            if wallet.get("kind").is_none() {
                wallet["kind"] = json!("asset")
            }
            wallets.push(wallet)
        }
        for t in array(&mut data, "transactions") {
            if old(text(t, "wallet")) {
                t["wallet"] = json!("assets")
            }
        }
        data["wallets"] = json!(wallets);
        data["schemaVersion"] = json!(3);
    }
    repair(&mut data)?;
    validate(&data)?;
    Ok(data)
}
fn assign(data: &mut Value, transaction_id: &Value, target: &str) -> Result<()> {
    let ti = list(data, "transactions")
        .iter()
        .position(|t| t["id"] == *transaction_id)
        .ok_or("Transaction no longer exists.")?;
    let source_id = text(&data["transactions"][ti], "wallet").to_string();
    if !is_hidden(&source_id) {
        return Err("This transaction already belongs to a wallet.".into());
    }
    let source = list(data, "wallets")
        .iter()
        .position(|w| text(w, "id") == source_id)
        .ok_or("Original wallet is missing.")?;
    let dest = wallet_index(data, target, false)?;
    let kind = |w: &Value| {
        if text(w, "kind") == "liability" {
            "liability"
        } else {
            "asset"
        }
    };
    if kind(&data["wallets"][source]) != kind(&data["wallets"][dest]) {
        return Err("Choose a matching wallet for this transaction.".into());
    }
    let delta = cents(&data["transactions"][ti]["amount"])
        * if kind(&data["wallets"][dest]) == "liability" {
            -1
        } else {
            1
        };
    data["wallets"][source]["balance"] = money(cents(&data["wallets"][source]["balance"]) - delta);
    data["wallets"][dest]["balance"] = money(cents(&data["wallets"][dest]["balance"]) + delta);
    data["transactions"][ti]["wallet"] = json!(target);
    Ok(())
}
fn repair(data: &mut Value) -> Result<()> {
    let transactions = list(data, "transactions").to_vec();
    for t in transactions.iter().filter(|t| is_hidden(text(t, "wallet"))) {
        let source = list(data, "wallets")
            .iter()
            .find(|w| text(w, "id") == text(t, "wallet"));
        let liability = source.is_some_and(|w| text(w, "kind") == "liability");
        let targets: Vec<_> = list(data, "wallets")
            .iter()
            .filter(|w| !is_hidden(text(w, "id")) && (text(w, "kind") == "liability") == liability)
            .map(|w| text(w, "id").to_string())
            .collect();
        if targets.len() == 1 {
            assign(data, &t["id"], &targets[0])?
        }
    }
    Ok(())
}
fn movement(
    data: &mut Value,
    wallet: &str,
    value: i64,
    date: &str,
    name: String,
    kind: &str,
    linked_id: &str,
) -> Result<String> {
    let wi = wallet_index(data, wallet, true)?;
    let balance = cents(&data["wallets"][wi]["balance"]);
    let held = reserved(data, wallet);
    if value < 0 && kind == "investment-buy" && -value > (balance - held).max(0) {
        return Err("This wallet does not have enough available money.".into());
    }
    if value < 0 && held > 0 && balance + value < held {
        return Err("Release savings from Goals before spending reserved money.".into());
    }
    let next = balance
        .checked_add(value)
        .filter(|n| n.abs() <= MAX_SAFE)
        .ok_or("This balance is too large.")?;
    data["wallets"][wi]["balance"] = money(next);
    let tid = id();
    let category = match kind {
        "loan-out" => "Money lent",
        "loan-repayment" => "Loan repayment",
        "investment-buy" => "Investment purchase",
        _ => "Investment sale",
    };
    let mut transaction = json!({"id":tid,"createdAt":now(),"name":name,"category":category,"kind":kind,"amount":money(value),"wallet":wallet,"date":date});
    transaction[if kind.starts_with("loan-") {
        "loanId"
    } else {
        "investmentId"
    }] = json!(linked_id);
    array(data, "transactions").push(transaction);
    Ok(tid)
}
fn goal_fields(fields: &Value) -> Result<Value> {
    let name = field_text(fields, "name", "Goal name", 80, true)?;
    let note = field_text(fields, "note", "Note", 200, false)?;
    let target = amount(&fields["target"], false)?;
    let date = text(fields, "targetDate");
    if !date.is_empty() && !valid_date(date) {
        return Err("Choose a valid target date.".into());
    }
    Ok(json!({"name":name,"note":note,"target":money(target),"targetDate":date}))
}
fn record_index(data: &Value, key: &str, id: &str) -> Result<usize> {
    list(data, key)
        .iter()
        .position(|v| text(v, "id") == id)
        .ok_or("This record no longer exists.".into())
}
fn trade_values(fields: &Value, selling: bool) -> Result<(i64, i64, i64, i64)> {
    let quantity = decimal(&fields["units"], 1_000_000, 1_000_000_000_000_000, false)?;
    let price = decimal(&fields["price"], 1_000_000, 100_000_000_000_000, selling)?;
    let fees =
        if fields.get("fee").is_none() || text(fields, "fee") == "" && fields["fee"].is_string() {
            0
        } else {
            amount(&fields["fee"], true)?
        };
    let gross = valuation(quantity, price);
    let total = gross + if selling { -fees } else { fees };
    if gross > MAX_MONEY || total < 0 || total > MAX_MONEY || (!selling && total == 0) {
        return Err("Trade proceeds and fees are outside the supported limits.".into());
    }
    Ok((quantity, price, fees, total))
}
pub fn apply_action(original: &Value, action: &Value, today: &str) -> Result<Value> {
    validate(original)?;
    let mut data = original.clone();
    let f = &action["fields"];
    let record = text(action, "id");
    match text(action, "type") {
        "create_wallet" => {
            let name = field_text(f, "name", "Wallet name", 80, true)?;
            let purpose = field_text(f, "purpose", "Purpose", 60, true)?;
            let balance = amount(&f["amount"], true)?;
            let kind = text(f, "kind");
            if !matches!(kind, "asset" | "liability") {
                return Err("Choose an account type.".into());
            }
            let provider = provider(text(f, "provider")).ok_or("Choose a card design.")?;
            let network = network(f)?;
            let color = ["purple", "green", "peach"][list(&data, "wallets").len() % 3];
            array(&mut data,"wallets").push(json!({"id":id(),"name":name,"type":purpose,"kind":kind,"provider":provider,"network":network,"balance":money(balance),"color":color}));
            data["hasAddedWallet"] = json!(true);
            repair(&mut data)?;
        }
        "create_transaction" => {
            let name = field_text(f, "name", "Description", 80, true)?;
            let value = amount(&f["amount"], false)?;
            let date = text(f, "date");
            if !valid_date(date) {
                return Err("Choose a valid date.".into());
            }
            let income = match text(f, "type") {
                "income" => true,
                "expense" => false,
                _ => return Err("Choose income or expense.".into()),
            };
            let wallet = text(f, "wallet");
            let wi = wallet_index(&data, wallet, false)?;
            let signed = if income { value } else { -value };
            let category = if income {
                "Income".to_string()
            } else {
                field_text(f, "category", "Category", 60, true)?
            };
            let liability = text(&data["wallets"][wi], "kind") == "liability";
            let balance =
                cents(&data["wallets"][wi]["balance"]) + signed * if liability { -1 } else { 1 };
            let held = reserved(&data, wallet);
            if !liability && held > 0 && balance < held {
                return Err("Release savings from Goals before spending reserved money.".into());
            }
            if balance.abs() > MAX_SAFE {
                return Err("This balance is too large.".into());
            }
            data["wallets"][wi]["balance"] = money(balance);
            array(&mut data,"transactions").push(json!({"id":id(),"createdAt":now(),"name":name,"category":category,"amount":money(signed),"wallet":wallet,"date":date}));
        }
        "delete_wallet" => {
            wallet_index(&data, record, false)?;
            array(&mut data, "wallets").retain(|v| text(v, "id") != record);
            array(&mut data, "transactions").retain(|v| text(v, "wallet") != record);
            data["hasAddedWallet"] = json!(list(&data, "wallets")
                .iter()
                .any(|w| !is_hidden(text(w, "id"))));
            if data.get("loans").is_some() {
                array(&mut data, "loans").retain(|v| text(v, "wallet") != record);
                for loan in array(&mut data, "loans") {
                    array(loan, "repayments").retain(|v| text(v, "wallet") != record)
                }
            }
            if data.get("goals").is_some() {
                for goal in array(&mut data, "goals") {
                    array(goal, "entries").retain(|v| text(v, "wallet") != record)
                }
            }
            if data.get("investments").is_some() {
                for holding in array(&mut data, "investments") {
                    for trade in array(holding, "trades") {
                        if text(trade, "wallet") == record {
                            trade["wallet"] = Value::Null;
                            trade["transactionId"] = Value::Null
                        }
                    }
                }
            }
        }
        "assign_transactions" => {
            let assignments = action["assignments"]
                .as_array()
                .ok_or("Choose transaction wallets.")?;
            for pair in assignments {
                assign(
                    &mut data,
                    &pair[0],
                    pair[1].as_str().ok_or("Choose a wallet.")?,
                )?
            }
        }
        "wallet_appearance" => {
            let i = wallet_index(&data, record, false)?;
            data["wallets"][i]["provider"] =
                json!(provider(text(f, "provider")).ok_or("Choose a card design.")?);
            data["wallets"][i]["network"] = json!(network(f)?);
        }
        "reorder_wallets" => {
            let from = wallet_index(&data, record, false)?;
            let to = wallet_index(&data, text(action, "target"), false)?;
            let wallets = array(&mut data, "wallets");
            let wallet = wallets.remove(from);
            wallets.insert(to, wallet);
        }
        "preferences" => {
            let fields = f.as_object().ok_or("Invalid appearance preferences.")?;
            if !data["preferences"].is_object() {
                data["preferences"] = json!({})
            }
            for (key, value) in fields {
                let v = value.as_str().ok_or("Invalid appearance preference.")?;
                if !((key == "summaryColor"
                    && matches!(v, "green" | "blue" | "purple" | "teal" | "rose" | "amber"))
                    || (key == "displayMode" && matches!(v, "dark" | "light")))
                {
                    return Err("Unknown appearance preference.".into());
                }
                data["preferences"][key] = value.clone();
            }
        }
        "create_loan" => {
            let person = field_text(f, "person", "Person's name", 80, true)?;
            let note = field_text(f, "note", "Note", 200, false)?;
            let principal = amount(&f["amount"], false)?;
            let issued = text(f, "issuedDate");
            let due = text(f, "dueDate");
            check_date(issued, today, "")?;
            if !due.is_empty() && (!valid_date(due) || due < issued) {
                return Err("The due date must be on or after the date lent.".into());
            }
            let lid = id();
            let existing = f["existing"] == true;
            let wallet = if existing {
                Value::Null
            } else {
                json!(text(f, "wallet"))
            };
            let tid = if existing {
                Value::Null
            } else {
                json!(movement(
                    &mut data,
                    text(f, "wallet"),
                    -principal,
                    issued,
                    format!("Lent to {person}"),
                    "loan-out",
                    &lid
                )?)
            };
            array(&mut data,"loans").push(json!({"id":lid,"person":person,"principal":money(principal),"issuedDate":issued,"dueDate":due,"note":note,"wallet":wallet,"transactionId":tid,"repayments":[],"createdAt":now()}));
        }
        "repayment" => {
            let i = record_index(&data, "loans", record)?;
            let loan = data["loans"][i].clone();
            let value = amount(&f["amount"], false)?;
            let date = text(f, "date");
            check_date(date, today, text(&loan, "issuedDate"))?;
            if value > owed(&loan) {
                return Err("Repayment cannot exceed the amount still owed.".into());
            }
            let tid = movement(
                &mut data,
                text(f, "wallet"),
                value,
                date,
                format!("Repayment from {}", text(&loan, "person")),
                "loan-repayment",
                record,
            )?;
            array(&mut data["loans"][i],"repayments").push(json!({"id":id(),"amount":money(value),"date":date,"wallet":text(f,"wallet"),"transactionId":tid}));
        }
        "create_goal" | "update_goal" => {
            let mut fields = goal_fields(f)?;
            if text(action, "type") == "create_goal" {
                fields["id"] = json!(id());
                fields["entries"] = json!([]);
                fields["createdAt"] = json!(now());
                array(&mut data, "goals").push(fields)
            } else {
                let i = record_index(&data, "goals", record)?;
                if cents(&fields["target"]) < goal_saved(&data["goals"][i]) {
                    return Err("Release savings before lowering the goal target.".into());
                }
                for (key, value) in fields.as_object().unwrap() {
                    data["goals"][i][key] = value.clone();
                }
            }
        }
        "delete_goal" => {
            record_index(&data, "goals", record)?;
            array(&mut data, "goals").retain(|g| text(g, "id") != record)
        }
        "contribute_goal" | "release_goal" => {
            let i = record_index(&data, "goals", record)?;
            let wallet = text(f, "wallet");
            let wi = wallet_index(&data, wallet, true)?;
            let value = amount(&f["amount"], false)?;
            let date = text(f, "date");
            check_date(date, today, "")?;
            let release = text(action, "type") == "release_goal";
            let goal = &data["goals"][i];
            if release {
                let allocated: i64 = list(goal, "entries")
                    .iter()
                    .filter(|e| text(e, "wallet") == wallet)
                    .map(|e| cents(&e["amount"]))
                    .sum();
                if value > allocated {
                    return Err(
                        "This amount exceeds the savings reserved in this wallet for the goal."
                            .into(),
                    );
                }
            } else {
                if value > cents(&goal["target"]) - goal_saved(goal) {
                    return Err("This amount exceeds the remaining target.".into());
                }
                if value > (cents(&data["wallets"][wi]["balance"]) - reserved(&data, wallet)).max(0)
                {
                    return Err("This wallet does not have enough unallocated money.".into());
                }
            }
            array(&mut data["goals"][i],"entries").push(json!({"id":id(),"amount":money(if release{-value}else{value}),"wallet":wallet,"date":date,"createdAt":now()}));
        }
        "create_investment" => {
            let name = field_text(f, "name", "Holding name", 80, true)?;
            let symbol = field_text(f, "symbol", "Symbol", 20, false)?.to_uppercase();
            let kind = text(f, "type");
            if !matches!(kind, "Stocks" | "Funds" | "Crypto" | "Bonds" | "Other") {
                return Err("Choose an investment type.".into());
            }
            let (q, p, fees, total) = trade_values(f, false)?;
            let date = text(f, "date");
            check_date(date, today, "")?;
            let has_quote = !f["currentPrice"].is_null()
                && (!f["currentPrice"].is_string() || !text(f, "currentPrice").trim().is_empty());
            let price = if has_quote {
                decimal(&f["currentPrice"], 1_000_000, 100_000_000_000_000, true)?
            } else {
                p
            };
            if valuation(q, price) > MAX_MONEY {
                return Err("Holding value exceeds the supported limit.".into());
            }
            let hid = id();
            let existing = f["existing"] == true;
            let tid = if existing {
                Value::Null
            } else {
                json!(movement(
                    &mut data,
                    text(f, "wallet"),
                    -total,
                    date,
                    format!("Buy {name}"),
                    "investment-buy",
                    &hid
                )?)
            };
            let trade = json!({"id":id(),"kind":"buy","units":q as f64/1e6,"price":p as f64/1e6,"fee":money(fees),"total":money(total),"date":date,"wallet":if existing{Value::Null}else{json!(text(f,"wallet"))},"transactionId":tid,"createdAt":now()});
            array(&mut data,"investments").push(json!({"id":hid,"name":name,"symbol":symbol,"type":kind,"units":q as f64/1e6,"costBasis":money(total),"price":price as f64/1e6,"priceDate":if has_quote{today}else{date},"createdAt":now(),"trades":[trade]}));
        }
        "trade_investment" => {
            let i = record_index(&data, "investments", record)?;
            let holding = data["investments"][i].clone();
            let kind = text(f, "kind");
            if !matches!(kind, "buy" | "sell") {
                return Err("Choose a purchase or sale.".into());
            }
            let selling = kind == "sell";
            let (q, p, fees, total) = trade_values(f, selling)?;
            let date = text(f, "date");
            let last = list(&holding, "trades")
                .last()
                .ok_or("Holding has no purchase history.")?;
            check_date(date, today, text(last, "date"))?;
            let current = units(&holding["units"]);
            if selling && q > current {
                return Err("You cannot sell more units than you hold.".into());
            }
            let remaining = current + if selling { -q } else { q };
            if remaining > 1_000_000_000_000_000 {
                return Err("Quantity exceeds the supported limit.".into());
            }
            let removed = if selling {
                ((cents(&holding["costBasis"]) as i128 * q as i128 + current as i128 / 2)
                    / current as i128) as i64
            } else {
                0
            };
            let cost = cents(&holding["costBasis"]) + if selling { -removed } else { total };
            let latest = date >= text(&holding, "priceDate");
            let price = if latest { p } else { units(&holding["price"]) };
            if cost > MAX_MONEY || valuation(remaining, price) > MAX_MONEY {
                return Err("Holding value exceeds the supported limit.".into());
            }
            let tid = movement(
                &mut data,
                text(f, "wallet"),
                if selling { total } else { -total },
                date,
                format!(
                    "{} {}",
                    if selling { "Sell" } else { "Buy" },
                    text(&holding, "name")
                ),
                if selling {
                    "investment-sell"
                } else {
                    "investment-buy"
                },
                record,
            )?;
            let mut trade = json!({"id":id(),"kind":kind,"units":q as f64/1e6,"price":p as f64/1e6,"fee":money(fees),"total":money(total),"date":date,"wallet":text(f,"wallet"),"transactionId":tid,"createdAt":now()});
            if selling {
                trade["costRemoved"] = money(removed);
                trade["gain"] = money(total - removed)
            }
            let h = &mut data["investments"][i];
            h["units"] = json!(remaining as f64 / 1e6);
            h["costBasis"] = money(cost);
            h["price"] = json!(price as f64 / 1e6);
            if latest {
                h["priceDate"] = json!(date)
            }
            array(h, "trades").push(trade);
        }
        "investment_price" => {
            let i = record_index(&data, "investments", record)?;
            let h = &data["investments"][i];
            if units(&h["units"]) == 0 {
                return Err("Choose an active holding.".into());
            }
            let price = decimal(&f["price"], 1_000_000, 100_000_000_000_000, true)?;
            let date = text(f, "date");
            check_date(date, today, text(list(h, "trades").last().unwrap(), "date"))?;
            if valuation(units(&h["units"]), price) > MAX_MONEY {
                return Err("Holding value exceeds the supported limit.".into());
            }
            data["investments"][i]["price"] = json!(price as f64 / 1e6);
            data["investments"][i]["priceDate"] = json!(date);
        }
        "save_budget" => {
            let month = text(f, "month");
            if month.len() != 7 || !valid_date(&format!("{month}-01")) {
                return Err("Choose a valid budget month.".into());
            }
            let total = amount(&f["totalLimit"], false)?;
            let allocations = f["allocations"]
                .as_array()
                .ok_or("Category limits are invalid.")?;
            let mut seen = HashSet::new();
            let mut sum = 0;
            let mut limits = vec![];
            for entry in allocations {
                let category = field_text(entry, "category", "Category", 60, true)?;
                if !seen.insert(category.to_lowercase()) {
                    return Err("Choose a different category for each limit.".into());
                }
                let limit = amount(&entry["limit"], false)?;
                sum += limit;
                limits.push(json!({"category":category,"limit":money(limit)}));
            }
            if sum > total {
                return Err("Category limits cannot exceed the monthly limit.".into());
            }
            let existing = list(&data, "budgetPlans")
                .iter()
                .position(|p| text(p, "month") == month);
            let plan = json!({"id":existing.map(|i|data["budgetPlans"][i]["id"].clone()).unwrap_or_else(||json!(id())),"month":month,"totalLimit":money(total),"allocations":limits,"createdAt":existing.map(|i|data["budgetPlans"][i]["createdAt"].clone()).unwrap_or_else(||json!(now()))});
            if let Some(i) = existing {
                data["budgetPlans"][i] = plan
            } else {
                array(&mut data, "budgetPlans").push(plan)
            }
        }
        "delete_budget" => {
            if !list(&data, "budgetPlans")
                .iter()
                .any(|p| text(p, "month") == record)
            {
                return Err("There is no budget plan for this month.".into());
            }
            array(&mut data, "budgetPlans").retain(|p| text(p, "month") != record)
        }
        _ => return Err("Unknown application action.".into()),
    }
    validate(&data)?;
    Ok(data)
}
fn network(fields: &Value) -> Result<&str> {
    let v = text(fields, "network");
    if v.is_empty() {
        return Ok("folio");
    }
    if !matches!(v, "folio" | "visa" | "mastercard") {
        return Err("Choose a card network.".into());
    }
    Ok(v)
}
