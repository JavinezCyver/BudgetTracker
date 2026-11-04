mod analysis;
mod decimal;
mod mutations;
pub mod storage;
mod validation;
pub use analysis::analyze;
pub use mutations::{apply_action, migrate};
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};
pub use validation::validate;

pub type Result<T> = std::result::Result<T, String>;
pub const MAX_MONEY: i64 = 10_000_000_000;
pub const MAX_SAFE: i64 = 9_007_199_254_740_991;
pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
pub fn id() -> String {
    uuid::Uuid::new_v4().to_string()
}
pub fn text<'a>(value: &'a Value, key: &str) -> &'a str {
    value.get(key).and_then(Value::as_str).unwrap_or("")
}
pub fn list<'a>(value: &'a Value, key: &str) -> &'a [Value] {
    value
        .get(key)
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[])
}
pub fn array<'a>(value: &'a mut Value, key: &str) -> &'a mut Vec<Value> {
    if !value[key].is_array() {
        value[key] = json!([])
    }
    value[key].as_array_mut().unwrap()
}
pub fn cents(value: &Value) -> i64 {
    (value.as_f64().unwrap_or(0.0) * 100.0).round() as i64
}
pub fn money(value: i64) -> Value {
    json!(value as f64 / 100.0)
}
pub fn units(value: &Value) -> i64 {
    (value.as_f64().unwrap_or(0.0) * 1_000_000.0).round() as i64
}
pub fn valuation(quantity: i64, price: i64) -> i64 {
    i64::try_from((quantity as i128 * price as i128 + 5_000_000_000) / 10_000_000_000)
        .unwrap_or(i64::MAX)
}
pub fn is_hidden(id: &str) -> bool {
    matches!(id, "assets" | "liabilities")
}
pub fn transfer(value: &Value) -> bool {
    matches!(
        text(value, "kind"),
        "loan-out" | "loan-repayment" | "investment-buy" | "investment-sell"
    )
}
pub fn field_text(
    fields: &Value,
    key: &str,
    label: &str,
    max: usize,
    required: bool,
) -> Result<String> {
    let result = text(fields, key).trim();
    if required && result.is_empty() {
        return Err(format!("{label} cannot be blank."));
    }
    if result.chars().count() > max {
        return Err(format!("{label} is too long."));
    }
    Ok(result.to_string())
}
// Decimal input is normalized once at the boundary. Arithmetic uses integers thereafter.
pub fn decimal(value: &Value, scale: i64, max: i64, zero: bool) -> Result<i64> {
    decimal::parse(value, scale, max, zero)
}
pub fn amount(value: &Value, zero: bool) -> Result<i64> {
    decimal(value, 100, MAX_MONEY, zero)
}
pub fn valid_date(value: &str) -> bool {
    if value.len() != 10 || value.as_bytes()[4] != b'-' || value.as_bytes()[7] != b'-' {
        return false;
    }
    let parse = |s: &str| s.parse::<u32>().ok();
    let (Some(year), Some(month), Some(day)) = (
        value.get(..4).and_then(parse),
        value.get(5..7).and_then(parse),
        value.get(8..).and_then(parse),
    ) else {
        return false;
    };
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if leap {
                29
            } else {
                28
            }
        }
        _ => 0,
    };
    day > 0 && day <= days
}
pub fn today() -> String {
    // Civil date from Unix days, with Philippine UTC+8 offset; independent of OS timezone.
    let days = ((now() / 1000 + 8 * 3600) / 86400) as i64 + 719468;
    let era = days / 146097;
    let doe = days - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let mut year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = mp + if mp < 10 { 3 } else { -9 };
    if month <= 2 {
        year += 1
    }
    format!("{year:04}-{month:02}-{day:02}")
}
pub fn check_date(value: &str, today: &str, minimum: &str) -> Result<()> {
    if !valid_date(value) || value > today || (!minimum.is_empty() && value < minimum) {
        return Err("Choose a valid date on or before today and after the previous record.".into());
    }
    Ok(())
}
pub fn initial() -> Value {
    json!({"schemaVersion":3,"hasAddedWallet":false,"wallets":[{"id":"assets","name":"Assets","type":"What you own","kind":"asset","balance":0,"color":"green"},{"id":"liabilities","name":"Liabilities","type":"What you owe","kind":"liability","balance":0,"color":"peach"}],"transactions":[]})
}
pub fn reserved(data: &Value, wallet: &str) -> i64 {
    list(data, "goals")
        .iter()
        .flat_map(|g| list(g, "entries"))
        .filter(|e| text(e, "wallet") == wallet)
        .map(|e| cents(&e["amount"]))
        .sum()
}
pub fn goal_saved(goal: &Value) -> i64 {
    list(goal, "entries")
        .iter()
        .map(|e| cents(&e["amount"]))
        .sum()
}
pub fn owed(loan: &Value) -> i64 {
    cents(&loan["principal"])
        - list(loan, "repayments")
            .iter()
            .map(|e| cents(&e["amount"]))
            .sum::<i64>()
}
pub fn wallet_index(data: &Value, id: &str, asset: bool) -> Result<usize> {
    list(data, "wallets")
        .iter()
        .position(|w| {
            text(w, "id") == id && !is_hidden(id) && (!asset || text(w, "kind") != "liability")
        })
        .ok_or("Choose an existing wallet of the correct account type.".into())
}
pub fn provider(value: &str) -> Option<&'static str> {
    let lower = value.trim().to_lowercase();
    if lower == "pocketplan" {
        return Some("folio");
    }
    [
        "folio",
        "salmon",
        "atome",
        "gcash",
        "bpi",
        "maya",
        "unionbank",
        "maribank",
        "cimb",
        "bdo",
        "landbank",
        "wise",
        "rcbc",
    ]
    .into_iter()
    .find(|p| *p == lower)
}
