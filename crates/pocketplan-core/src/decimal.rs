use crate::Result;
use serde_json::Value;

/// Parse decimal text into scaled integers without accepting fractional cents/units.
/// Scientific notation and insignificant trailing zeroes are accepted exactly.
pub fn parse(value: &Value, scale: i64, max: i64, zero: bool) -> Result<i64> {
    let invalid =
        || "Enter a valid amount within the supported limit and decimal precision.".to_string();
    let raw = match value {
        Value::String(text) => text.trim().to_string(),
        Value::Number(n) => n.to_string(),
        _ => return Err(invalid()),
    };
    if raw.is_empty() || raw.len() > 128 {
        return Err(invalid());
    }
    let raw = raw.strip_prefix('+').unwrap_or(&raw);
    let parts: Vec<_> = raw.split(['e', 'E']).collect();
    if parts.len() > 2 {
        return Err(invalid());
    }
    let exponent = if parts.len() == 2 {
        parts[1].parse::<i32>().map_err(|_| invalid())?
    } else {
        0
    };
    if !(-400..=400).contains(&exponent) {
        return Err(invalid());
    }
    let mantissa: Vec<_> = parts[0].split('.').collect();
    if mantissa.len() > 2 {
        return Err(invalid());
    }
    let digits = mantissa.concat();
    if digits.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return Err(invalid());
    }
    let fraction = mantissa.get(1).map_or(0, |s| s.len()) as i32;
    let mut digits = digits.trim_start_matches('0').to_string();
    if digits.is_empty() {
        return if zero { Ok(0) } else { Err(invalid()) };
    }
    let power = scale.ilog10() as i32 + exponent - fraction;
    if power < 0 {
        let count = (-power) as usize;
        if count >= digits.len()
            || !digits.as_bytes()[digits.len() - count..]
                .iter()
                .all(|b| *b == b'0')
        {
            return Err(invalid());
        }
        digits.truncate(digits.len() - count);
    } else {
        if digits.len() + power as usize > 19 {
            return Err(invalid());
        }
        digits.push_str(&"0".repeat(power as usize));
    }
    let integer = digits.parse::<i64>().map_err(|_| invalid())?;
    if integer > max || (!zero && integer == 0) {
        return Err(invalid());
    }
    Ok(integer)
}
