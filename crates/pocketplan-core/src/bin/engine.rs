use pocketplan_core::{analyze, apply_action, initial, migrate, validate};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
fn main() {
    let mut out = io::BufWriter::new(io::stdout());
    for line in io::stdin().lock().lines() {
        let result = (|| -> Result<Value, String> {
            let request: Value = serde_json::from_str(&line.map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
            let data = request.get("data").cloned().unwrap_or_else(initial);
            match request["op"].as_str().unwrap_or("action") {
                "validate" => {
                    validate(&data)?;
                    Ok(data)
                }
                "migrate" => migrate(data),
                "analyze" => Ok(analyze(
                    &data,
                    request["today"]
                        .as_str()
                        .unwrap_or(&pocketplan_core::today()),
                )),
                _ => apply_action(
                    &data,
                    &request["action"],
                    request["today"]
                        .as_str()
                        .unwrap_or(&pocketplan_core::today()),
                ),
            }
        })();
        let response = match result {
            Ok(value) => json!({"ok":true,"value":value}),
            Err(error) => json!({"ok":false,"error":error}),
        };
        writeln!(out, "{response}").ok();
        out.flush().ok();
    }
}
