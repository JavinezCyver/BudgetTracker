use crate::*;
use serde_json::{json, Map, Value};
use std::collections::BTreeSet;
pub fn analyze(data: &Value, today: &str) -> Value {
    let mut assets = 0;
    let mut liabilities = 0;
    let mut portfolio = 0;
    let mut cost = 0;
    let mut realized = 0;
    let mut received = 0;
    let mut lent = 0;
    let mut overdue = 0;
    let mut wallets = Map::new();
    let mut goals = Map::new();
    let mut loans = Map::new();
    let mut investments = Map::new();
    let mut months = BTreeSet::new();
    months.insert(today[..7].to_string());
    for w in list(data, "wallets") {
        let balance = cents(&w["balance"]);
        if text(w, "kind") == "liability" {
            liabilities += balance
        } else {
            assets += balance
        }
        let held = reserved(data, text(w, "id"));
        wallets.insert(
            text(w, "id").into(),
            json!({"reserved":money(held),"available":money((balance-held).max(0))}),
        );
    }
    for g in list(data, "goals") {
        let saved = goal_saved(g);
        let status = if saved == cents(&g["target"]) {
            "completed"
        } else if !text(g, "targetDate").is_empty() && text(g, "targetDate") < today {
            "overdue"
        } else {
            "active"
        };
        goals.insert(
            text(g, "id").into(),
            json!({"saved":money(saved),"status":status}),
        );
    }
    for l in list(data, "loans") {
        let value = owed(l);
        let status = if value == 0 {
            "paid"
        } else if !text(l, "dueDate").is_empty() && text(l, "dueDate") < today {
            "overdue"
        } else {
            "open"
        };
        lent += value;
        received += cents(&l["principal"]) - value;
        if status == "overdue" {
            overdue += value
        }
        loans.insert(
            text(l, "id").into(),
            json!({"outstanding":money(value),"status":status}),
        );
    }
    for h in list(data, "investments") {
        let value = valuation(units(&h["units"]), units(&h["price"]));
        let gain: i64 = list(h, "trades")
            .iter()
            .filter(|t| text(t, "kind") == "sell")
            .map(|t| cents(&t["gain"]))
            .sum();
        portfolio += value;
        cost += cents(&h["costBasis"]);
        realized += gain;
        investments.insert(
            text(h, "id").into(),
            json!({"value":money(value),"realized":money(gain)}),
        );
    }
    for t in list(data, "transactions") {
        if text(t, "date").len() >= 7 {
            months.insert(text(t, "date")[..7].to_string());
        }
    }
    for p in list(data, "budgetPlans") {
        months.insert(text(p, "month").to_string());
    }
    let mut budgets = Map::new();
    for month in months {
        budgets.insert(month.clone(), budget(data, &month));
    }
    json!({"today":today,"assets":money(assets+lent+portfolio),"liabilities":money(liabilities),"netWorth":money(assets+lent+portfolio-liabilities),"receivables":money(lent),"portfolio":money(portfolio),"wallets":wallets,"goals":goals,"loans":loans,"investments":investments,"lendingTotals":{"owed":money(lent),"overdue":money(overdue),"repaid":money(received)},"investmentTotals":{"value":money(portfolio),"cost":money(cost),"unrealized":money(portfolio-cost),"realized":money(realized),"gain":money(portfolio-cost+realized)},"budgets":budgets})
}
fn budget(data: &Value, month: &str) -> Value {
    let plan = list(data, "budgetPlans")
        .iter()
        .find(|p| text(p, "month") == month);
    let mut grouped: Vec<(String, String, Option<i64>, i64)> = vec![];
    if let Some(p) = plan {
        for a in list(p, "allocations") {
            grouped.push((
                text(a, "category").trim().to_lowercase(),
                text(a, "category").into(),
                Some(cents(&a["limit"])),
                0,
            ))
        }
    }
    let mut spent = 0;
    let mut count = 0;
    for t in list(data, "transactions").iter().filter(|t| {
        text(t, "date").starts_with(&format!("{month}-")) && cents(&t["amount"]) < 0 && !transfer(t)
    }) {
        let value = -cents(&t["amount"]);
        spent += value;
        count += 1;
        let key = text(t, "category").trim().to_lowercase();
        if let Some(entry) = grouped.iter_mut().find(|g| g.0 == key) {
            entry.3 += value
        } else {
            grouped.push((key, text(t, "category").into(), None, value))
        }
    }
    let categories:Vec<_>=grouped.iter().map(|(_,category,limit,value)|json!({"category":category,"limit":limit.map(money),"spent":money(*value),"remaining":limit.map(|cap|money(cap-value))})).collect();
    json!({"plan":plan,"spent":money(spent),"remaining":plan.map(|p|money(cents(&p["totalLimit"])-spent)),"count":count,"categories":categories})
}
