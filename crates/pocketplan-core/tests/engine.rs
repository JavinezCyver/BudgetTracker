use pocketplan_core::storage::Store;
use pocketplan_core::*;
use serde_json::{json, Value};
const TODAY: &str = "2026-11-04";
fn action(data: &Value, kind: &str, record: &str, fields: Value) -> Value {
    apply_action(
        data,
        &json!({"type":kind,"id":record,"fields":fields}),
        TODAY,
    )
    .unwrap()
}
fn funded() -> Value {
    action(
        &initial(),
        "create_wallet",
        "",
        json!({"name":"Savings","purpose":"Emergency fund","amount":"1000","kind":"asset","provider":"maya","network":"visa"}),
    )
}
fn wallet(data: &Value) -> String {
    text(&data["wallets"][2], "id").into()
}
#[test]
fn exact_decimal_and_date_boundaries() {
    assert_eq!(amount(&json!("0.30"), false).unwrap(), 30);
    assert_eq!(amount(&json!("1.2300"), false).unwrap(), 123);
    assert_eq!(amount(&json!("1e-2"), false).unwrap(), 1);
    assert!(amount(&json!("0.000000001"), false).is_err());
    assert!(amount(&json!("1.00000000001"), false).is_err());
    assert!(decimal(&json!("0.0000001"), 1_000_000, MAX_SAFE, false).is_err());
    assert!(amount(&json!("0.001"), false).is_err());
    assert!(amount(&json!(""), true).is_err());
    assert!(amount(&json!(true), true).is_err());
    assert!(valid_date("2024-02-29"));
    assert!(!valid_date("2026-02-29"));
    assert!(!valid_date("2026-13-01"));
    assert!(!valid_date("2026-11-00"));
    assert!(!valid_date("💰💰💰"));
    assert!(valid_date(&today()));
    assert_eq!(valuation(1_000_000, 1_005_000), 101);
    assert_eq!(
        valuation(1_000_000_000_000_000, 100_000_000_000_000),
        i64::MAX
    );
}
#[test]
fn transactions_are_applied_in_centavos() {
    let mut data = funded();
    let w = wallet(&data);
    for _ in 0..3 {
        data = action(
            &data,
            "create_transaction",
            "",
            json!({"name":"Food","type":"expense","amount":"0.10","wallet":w,"category":"Food","date":TODAY}),
        );
    }
    assert_eq!(cents(&data["wallets"][2]["balance"]), 99970);
    assert_eq!(list(&data, "transactions").len(), 3);
    validate(&data).unwrap();
}
#[test]
fn reserved_goals_block_spending_and_investments() {
    let mut data = funded();
    let w = wallet(&data);
    data = action(
        &data,
        "create_goal",
        "",
        json!({"name":"Trip","target":"1000"}),
    );
    let g = text(&data["goals"][0], "id").to_string();
    data = action(
        &data,
        "contribute_goal",
        &g,
        json!({"wallet":w,"amount":"900","date":TODAY}),
    );
    assert_eq!(cents(&data["wallets"][2]["balance"]), 100000);
    for kind in ["create_transaction", "create_investment", "create_loan"] {
        let fields = json!({"name":"Test","person":"Alex","type":if kind=="create_investment"{"Stocks"}else{"expense"},"target":"200","amount":"200","price":"200","units":"1","wallet":w,"category":"Other","date":TODAY,"issuedDate":TODAY});
        assert!(apply_action(&data, &json!({"type":kind,"fields":fields}), TODAY).is_err());
    }
    data = action(
        &data,
        "release_goal",
        &g,
        json!({"wallet":w,"amount":"400","date":TODAY}),
    );
    assert_eq!(goal_saved(&data["goals"][0]), 50000);
}
#[test]
fn loan_repayment_preserves_wealth_and_rejects_overpayment() {
    let mut data = funded();
    let w = wallet(&data);
    data = action(
        &data,
        "create_loan",
        "",
        json!({"person":"Alex","amount":"300","issuedDate":TODAY,"wallet":w}),
    );
    let l = text(&data["loans"][0], "id").to_string();
    assert_eq!(cents(&data["wallets"][2]["balance"]), 70000);
    assert_eq!(analyze(&data, TODAY)["netWorth"], 1000.0);
    data = action(
        &data,
        "repayment",
        &l,
        json!({"amount":"100","wallet":w,"date":TODAY}),
    );
    assert_eq!(owed(&data["loans"][0]), 20000);
    assert!(apply_action(
        &data,
        &json!({"type":"repayment","id":l,"fields":{"amount":"201","wallet":w,"date":TODAY}}),
        TODAY
    )
    .is_err());
}
#[test]
fn fractional_purchases_and_partial_sales_use_integer_cost_basis() {
    let mut data = funded();
    let w = wallet(&data);
    data = action(
        &data,
        "create_investment",
        "",
        json!({"name":"Fund","type":"Funds","units":"10","price":"10","wallet":w,"date":TODAY}),
    );
    let h = text(&data["investments"][0], "id").to_string();
    data = action(
        &data,
        "trade_investment",
        &h,
        json!({"kind":"sell","units":"4","price":"15","fee":"0","wallet":w,"date":TODAY}),
    );
    assert_eq!(cents(&data["investments"][0]["costBasis"]), 6000);
    data = action(
        &data,
        "trade_investment",
        &h,
        json!({"kind":"sell","units":"6","price":"15","fee":"1","wallet":w,"date":TODAY}),
    );
    assert_eq!(units(&data["investments"][0]["units"]), 0);
    assert_eq!(cents(&data["wallets"][2]["balance"]), 104900);
    assert_eq!(analyze(&data, TODAY)["investmentTotals"]["realized"], 49.0);
}
#[test]
fn budget_excludes_capital_movements() {
    let mut data = funded();
    let w = wallet(&data);
    data = action(
        &data,
        "create_loan",
        "",
        json!({"person":"Alex","amount":"300","issuedDate":TODAY,"wallet":w}),
    );
    data = action(
        &data,
        "save_budget",
        "",
        json!({"month":"2026-11","totalLimit":"500","allocations":[{"category":"Food","limit":"200"}]}),
    );
    data = action(
        &data,
        "create_transaction",
        "",
        json!({"name":"Lunch","amount":"250","wallet":w,"date":TODAY,"type":"expense","category":"Food"}),
    );
    let view = analyze(&data, TODAY);
    let budget = &view["budgets"]["2026-11"];
    assert_eq!(budget["spent"], 250.0);
    assert_eq!(budget["remaining"], 250.0);
    assert_eq!(budget["categories"][0]["remaining"], -50.0);
}
#[test]
fn deletion_cascades_and_detaches_investments() {
    let mut data = funded();
    let w = wallet(&data);
    data = action(
        &data,
        "create_investment",
        "",
        json!({"name":"Fund","type":"Funds","units":"1","price":"10","wallet":w,"date":TODAY}),
    );
    data = action(&data, "delete_wallet", &w, json!({}));
    assert!(list(&data, "transactions").is_empty());
    assert_eq!(list(&data, "investments").len(), 1);
    assert!(data["investments"][0]["trades"][0]["wallet"].is_null());
    validate(&data).unwrap();
}
#[test]
fn arbitrary_state_replacement_and_hidden_wallet_edits_are_rejected() {
    let data = funded();
    for action in [
        json!({"type":"save_data","data":{"wallets":[]}}),
        json!({"type":"delete_wallet","id":"assets"}),
        json!({"type":"preferences","fields":{"balance":100000}}),
    ] {
        assert!(apply_action(&data, &action, TODAY).is_err());
    }
    assert_eq!(cents(&data["wallets"][2]["balance"]), 100000);
}
struct Temp(std::path::PathBuf);
impl Temp {
    fn new() -> Self {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("test-data")
            .join(id());
        std::fs::create_dir_all(&root).unwrap();
        Self(root)
    }
    fn file(&self) -> std::path::PathBuf {
        self.0.join("budget.json")
    }
}
impl Drop for Temp {
    fn drop(&mut self) {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("test-data");
        if self.0.starts_with(root) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
}
#[test]
fn persistence_is_atomic_and_stale_revisions_never_overwrite() {
    let temp = Temp::new();
    let mut first = Store::open(temp.file()).unwrap();
    let mut second = Store::open(temp.file()).unwrap();
    let action = json!({"type":"preferences","fields":{"summaryColor":"blue"}});
    let saved = first.execute(&action, 0).unwrap();
    assert_eq!(saved.revision, 1);
    assert!(first.execute(&action, 0).is_err());
    assert!(second.execute(&action, 0).is_err());
    assert_eq!(
        Store::open(temp.file()).unwrap().snapshot().data["preferences"]["summaryColor"],
        "blue"
    );
    let before = std::fs::read(temp.file()).unwrap();
    assert!(first.execute(&json!({"type":"save_data"}), 1).is_err());
    assert_eq!(std::fs::read(temp.file()).unwrap(), before);
    assert_eq!(
        first
            .execute(
                &json!({"type":"preferences","fields":{"summaryColor":"purple"}}),
                1
            )
            .unwrap()
            .revision,
        2
    );
    assert_eq!(
        Store::open(temp.file()).unwrap().snapshot().data["preferences"]["summaryColor"],
        "purple"
    );
}
#[test]
fn corrupted_files_are_preserved_and_os_lock_is_respected() {
    let temp = Temp::new();
    std::fs::write(temp.file(), b"{broken").unwrap();
    assert!(Store::open(temp.file()).is_err());
    assert_eq!(std::fs::read(temp.file()).unwrap(), b"{broken");
    let lock = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(temp.0.join("budget.lock"))
        .unwrap();
    lock.lock().unwrap();
    assert!(Store::open(temp.file()).is_err());
    drop(lock);
}

#[test]
fn external_deletion_cannot_resurrect_an_old_snapshot() {
    let temp = Temp::new();
    let mut store = Store::open(temp.file()).unwrap();
    store
        .execute(
            &json!({"type":"preferences","fields":{"displayMode":"light"}}),
            0,
        )
        .unwrap();
    std::fs::remove_file(temp.file()).unwrap();
    assert!(store
        .execute(
            &json!({"type":"preferences","fields":{"displayMode":"dark"}}),
            1
        )
        .is_err());
    assert!(!temp.file().exists());
    assert_eq!(store.snapshot().revision, 1);
}
#[test]
fn legacy_assignment_repair_is_idempotent() {
    let data = json!({"schemaVersion":3,"wallets":[{"id":"assets","name":"Assets","kind":"asset","balance":-1000},{"id":"liabilities","name":"Liabilities","kind":"liability","balance":0},{"id":"bank","name":"Savings","kind":"asset","balance":5000}],"transactions":[{"id":1,"name":"Expense","category":"Food","amount":-1000,"date":TODAY,"wallet":"assets"}]});
    let repaired = migrate(data).unwrap();
    assert_eq!(repaired["wallets"][0]["balance"], 0.0);
    assert_eq!(repaired["wallets"][2]["balance"], 4000.0);
    assert_eq!(repaired["transactions"][0]["wallet"], "bank");
    assert_eq!(migrate(repaired.clone()).unwrap(), repaired);
}
