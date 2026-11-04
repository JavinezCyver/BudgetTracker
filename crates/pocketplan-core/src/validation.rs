use crate::*;
use std::collections::{HashMap, HashSet};
fn error(label: &str) -> String {
    format!("Saved {label} data is invalid. Changes have been blocked to protect it.")
}
fn number(value: &Value, max: i64, signed: bool, zero: bool) -> bool {
    value.as_f64().is_some_and(|n| {
        n.is_finite()
            && (signed || n >= 0.0)
            && (zero || n != 0.0)
            && (n * 100.0).abs() <= max as f64
            && ((n * 100.0) - (n * 100.0).round()).abs() < 0.001
    })
}
fn required_array<'a>(data: &'a Value, key: &str) -> Result<&'a [Value]> {
    data[key]
        .as_array()
        .map(Vec::as_slice)
        .ok_or_else(|| error(key))
}
fn unique_id(value: &Value, ids: &mut HashSet<String>) -> bool {
    let key = value
        .as_str()
        .filter(|s| !s.is_empty())
        .map(|s| format!("s:{s}"))
        .or_else(|| value.as_i64().map(|n| format!("n:{n}")));
    key.is_some_and(|k| ids.insert(k))
}
pub fn validate(data: &Value) -> Result<()> {
    if !data.is_object() {
        return Err(error("application"));
    }
    if let Some(version) = data.get("schemaVersion") {
        if !matches!(version.as_u64(), Some(1..=3)) {
            return Err("This saved data belongs to an unsupported app version.".into());
        }
    }
    let mut ids = HashSet::new();
    let mut transactions = HashSet::new();
    let wallets = required_array(data, "wallets")?;
    for w in wallets {
        if !w["id"].is_string()
            || !unique_id(&w["id"], &mut ids)
            || text(w, "name").trim().is_empty()
            || !number(&w["balance"], MAX_SAFE, true, true)
            || w.get("kind")
                .is_some_and(|k| !matches!(k.as_str(), Some("asset" | "liability")))
        {
            return Err(error("wallet"));
        }
    }
    let wallet_ref = |v: &Value| v.as_str().is_some_and(|s| ids.contains(&format!("s:{s}")));
    let ts = required_array(data, "transactions")?;
    let magnitude: i128 = wallets
        .iter()
        .map(|w| cents(&w["balance"]).unsigned_abs() as i128)
        .sum::<i128>()
        + ts.iter()
            .map(|t| cents(&t["amount"]).unsigned_abs() as i128)
            .sum::<i128>();
    if magnitude > MAX_SAFE as i128 {
        return Err("Saved balances and history exceed the supported numeric range.".into());
    }
    for t in ts {
        if !unique_id(&t["id"], &mut transactions)
            || !wallet_ref(&t["wallet"])
            || text(t, "name").trim().is_empty()
            || !t["category"].is_string()
            || !number(&t["amount"], MAX_SAFE, true, true)
            || !valid_date(text(t, "date"))
        {
            return Err(error("transaction"));
        }
    }
    let tx_ref = |v: &Value| {
        let key = if let Some(s) = v.as_str() {
            format!("s:{s}")
        } else if let Some(n) = v.as_i64() {
            format!("n:{n}")
        } else {
            return false;
        };
        transactions.contains(&key)
    };
    if data.get("loans").is_some() {
        let mut records = HashSet::new();
        let mut payments = HashSet::new();
        for loan in required_array(data, "loans")? {
            if !loan["id"].is_string()
                || !unique_id(&loan["id"], &mut records)
                || text(loan, "person").trim().is_empty()
                || !number(&loan["principal"], MAX_MONEY, false, false)
                || !valid_date(text(loan, "issuedDate"))
                || (!text(loan, "dueDate").is_empty()
                    && (!valid_date(text(loan, "dueDate"))
                        || text(loan, "dueDate") < text(loan, "issuedDate")))
                || (!loan["wallet"].is_null() && !wallet_ref(&loan["wallet"]))
                || (!loan["transactionId"].is_null() && !tx_ref(&loan["transactionId"]))
            {
                return Err(error("lending"));
            }
            for p in required_array(loan, "repayments")? {
                if !p["id"].is_string()
                    || !unique_id(&p["id"], &mut payments)
                    || !wallet_ref(&p["wallet"])
                    || !tx_ref(&p["transactionId"])
                    || !number(&p["amount"], MAX_MONEY, false, false)
                    || !valid_date(text(p, "date"))
                    || text(p, "date") < text(loan, "issuedDate")
                {
                    return Err(error("repayment"));
                }
            }
            if owed(loan) < 0 {
                return Err("Repayments exceed the recorded principal.".into());
            }
        }
    }
    if data.get("goals").is_some() {
        let mut records = HashSet::new();
        let mut entries = HashSet::new();
        for goal in required_array(data, "goals")? {
            if !goal["id"].is_string()
                || !unique_id(&goal["id"], &mut records)
                || text(goal, "name").trim().is_empty()
                || !number(&goal["target"], MAX_MONEY, false, false)
                || (!text(goal, "targetDate").is_empty() && !valid_date(text(goal, "targetDate")))
            {
                return Err(error("goal"));
            }
            let mut allocated: HashMap<String, i64> = HashMap::new();
            for e in required_array(goal, "entries")? {
                if !e["id"].is_string()
                    || !unique_id(&e["id"], &mut entries)
                    || wallet_index(data, text(e, "wallet"), true).is_err()
                    || !number(&e["amount"], MAX_MONEY, true, false)
                    || !valid_date(text(e, "date"))
                {
                    return Err(error("goal contribution"));
                }
                *allocated.entry(text(e, "wallet").into()).or_default() += cents(&e["amount"]);
            }
            if allocated.values().any(|v| *v < 0) || goal_saved(goal) > cents(&goal["target"]) {
                return Err("Saved goal contributions exceed their allocation or target.".into());
            }
        }
        for w in wallets {
            if reserved(data, text(w, "id")) > 0
                && reserved(data, text(w, "id")) > cents(&w["balance"])
            {
                return Err("Goals reserve more money than the wallet contains.".into());
            }
        }
    }
    if data.get("investments").is_some() {
        let mut records = HashSet::new();
        let mut trades = HashSet::new();
        for h in required_array(data, "investments")? {
            if !h["id"].is_string()
                || !unique_id(&h["id"], &mut records)
                || text(h, "name").trim().is_empty()
                || !matches!(
                    text(h, "type"),
                    "Stocks" | "Funds" | "Crypto" | "Bonds" | "Other"
                )
                || decimal(&h["units"], 1_000_000, 1_000_000_000_000_000, true).is_err()
                || decimal(&h["price"], 1_000_000, 100_000_000_000_000, true).is_err()
                || !number(&h["costBasis"], MAX_MONEY, false, true)
                || !valid_date(text(h, "priceDate"))
            {
                return Err(error("investment"));
            }
            if valuation(units(&h["units"]), units(&h["price"])) > MAX_MONEY
                || (units(&h["units"]) == 0 && cents(&h["costBasis"]) != 0)
            {
                return Err(error("investment valuation"));
            }
            let items = required_array(h, "trades")?;
            if items.is_empty() {
                return Err(error("investment trades"));
            }
            let mut quantity = 0;
            let mut last = "";
            for t in items {
                if !t["id"].is_string()
                    || !unique_id(&t["id"], &mut trades)
                    || !matches!(text(t, "kind"), "buy" | "sell")
                    || decimal(&t["units"], 1_000_000, 1_000_000_000_000_000, false).is_err()
                    || decimal(&t["price"], 1_000_000, 100_000_000_000_000, true).is_err()
                    || !number(&t["total"], MAX_MONEY, false, true)
                    || !number(&t["fee"], MAX_MONEY, false, true)
                    || !valid_date(text(t, "date"))
                    || text(t, "date") < last
                    || (!t["wallet"].is_null() && !wallet_ref(&t["wallet"]))
                    || (!t["transactionId"].is_null() && !tx_ref(&t["transactionId"]))
                {
                    return Err(error("investment trade"));
                }
                if text(t, "kind") == "sell"
                    && (!number(&t["gain"], MAX_MONEY, true, true)
                        || !number(&t["costRemoved"], MAX_MONEY, false, true))
                {
                    return Err(error("investment sale"));
                }
                last = text(t, "date");
                quantity += units(&t["units"]) * if text(t, "kind") == "buy" { 1 } else { -1 };
                if !(0..=1_000_000_000_000_000).contains(&quantity) {
                    return Err("Investment quantities exceed their supported range.".into());
                }
            }
            if quantity != units(&h["units"]) {
                return Err("Investment quantity does not match trade history.".into());
            }
        }
    }
    if data.get("budgetPlans").is_some() {
        let mut records = HashSet::new();
        let mut months = HashSet::new();
        for plan in required_array(data, "budgetPlans")? {
            let month = text(plan, "month");
            if !plan["id"].is_string()
                || !unique_id(&plan["id"], &mut records)
                || month.len() != 7
                || !valid_date(&format!("{month}-01"))
                || !months.insert(month)
                || !number(&plan["totalLimit"], MAX_MONEY, false, false)
            {
                return Err(error("budget plan"));
            }
            let mut categories = HashSet::new();
            let mut sum = 0;
            for a in required_array(plan, "allocations")? {
                let category = text(a, "category").trim();
                if category.is_empty()
                    || !categories.insert(category.to_lowercase())
                    || !number(&a["limit"], MAX_MONEY, false, false)
                {
                    return Err(error("category limit"));
                }
                sum += cents(&a["limit"])
            }
            if sum > cents(&plan["totalLimit"]) {
                return Err("Category limits exceed the monthly budget.".into());
            }
        }
    }
    Ok(())
}
