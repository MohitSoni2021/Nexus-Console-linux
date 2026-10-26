use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerAttribute {
    pub key: String,
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerHistoryPoint {
    pub timestamp: i64,
    pub value: f64,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerDevice {
    pub id: String,
    pub native_path: String,
    pub name: String,
    pub kind: String, // "line_power", "battery", "ups", "other"
    pub icon: String,
    pub is_online: Option<bool>,
    pub state: Option<String>,
    pub percentage: Option<f64>,
    pub capacity_health: Option<f64>,
    pub energy_wh: Option<f64>,
    pub energy_full_wh: Option<f64>,
    pub energy_design_wh: Option<f64>,
    pub rate_w: Option<f64>,
    pub voltage_v: Option<f64>,
    pub time_to_full: Option<String>,
    pub time_to_empty: Option<String>,
    pub vendor: Option<String>,
    pub model: Option<String>,
    pub serial: Option<String>,
    pub technology: Option<String>,
    pub refreshed: Option<String>,
    pub cycle_count: Option<u32>,
    pub attributes: Vec<PowerAttribute>,
    pub charge_history: Vec<PowerHistoryPoint>,
    pub rate_history: Vec<PowerHistoryPoint>,
    pub voltage_history: Vec<PowerHistoryPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerStatisticsDto {
    pub is_laptop: bool,
    pub chassis_type: String,
    pub device_class: String, // "Laptop", "Desktop PC", etc.
    pub on_battery: bool,
    pub has_battery: bool,
    pub devices: Vec<PowerDevice>,
}

#[tauri::command]
pub async fn get_power_statistics() -> AppResult<PowerStatisticsDto> {
    tauri::async_runtime::spawn_blocking(collect_power_statistics)
        .await
        .map_err(|e| AppError::Shell(format!("power task failed: {e}")))?
}

fn collect_power_statistics() -> AppResult<PowerStatisticsDto> {
    let (chassis_id, raw_chassis_name, is_laptop_chassis) = detect_chassis();

    // 1. Try UPower first
    let mut devices = if let Ok(output) = Command::new("upower").arg("-d").output() {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            parse_upower_output(&text)
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

    // 2. Fallback to /sys/class/power_supply if no devices found via upower
    if devices.is_empty() {
        devices = parse_sysfs_power_supply();
    }

    let has_battery = devices.iter().any(|d| d.kind == "battery");
    let on_battery = devices
        .iter()
        .any(|d| d.kind == "battery" && d.state.as_deref() == Some("discharging"));

    let is_laptop = is_laptop_chassis || has_battery;
    let device_class = if is_laptop {
        "Laptop".to_string()
    } else if chassis_id == 3 || chassis_id == 4 || chassis_id == 6 || chassis_id == 7 {
        "Desktop PC".to_string()
    } else if !raw_chassis_name.is_empty() && raw_chassis_name != "unknown" {
        format!("PC ({raw_chassis_name})")
    } else {
        "Desktop PC".to_string()
    };

    Ok(PowerStatisticsDto {
        is_laptop,
        chassis_type: raw_chassis_name,
        device_class,
        on_battery,
        has_battery,
        devices,
    })
}

fn detect_chassis() -> (u32, String, bool) {
    let chassis_paths = [
        "/sys/class/dmi/id/chassis_type",
        "/sys/devices/virtual/dmi/id/chassis_type",
    ];

    let mut chassis_id = 0u32;
    for p in &chassis_paths {
        if let Ok(content) = fs::read_to_string(p) {
            if let Ok(id) = content.trim().parse::<u32>() {
                chassis_id = id;
                break;
            }
        }
    }

    let (name, is_laptop) = match chassis_id {
        8 => ("Portable", true),
        9 => ("Laptop", true),
        10 => ("Notebook", true),
        11 => ("Hand Held", true),
        14 => ("Sub Notebook", true),
        30 => ("Tablet", true),
        31 => ("Convertible", true),
        32 => ("Detachable", true),
        3 => ("Desktop", false),
        4 => ("Low Profile Desktop", false),
        5 => ("Pizza Box", false),
        6 => ("Mini Tower", false),
        7 => ("Tower", false),
        17 => ("Main Server Chassis", false),
        23 => ("Rack Mount Chassis", false),
        _ => ("System", false),
    };

    (chassis_id, name.to_string(), is_laptop)
}

fn parse_upower_output(text: &str) -> Vec<PowerDevice> {
    let mut devices = Vec::new();
    let mut current_block: Vec<&str> = Vec::new();

    for line in text.lines() {
        if line.starts_with("Device: ") && !current_block.is_empty() {
            if let Some(dev) = parse_upower_device_block(&current_block) {
                devices.push(dev);
            }
            current_block.clear();
        }
        current_block.push(line);
    }

    if !current_block.is_empty() {
        if let Some(dev) = parse_upower_device_block(&current_block) {
            devices.push(dev);
        }
    }

    devices
}

fn parse_upower_device_block(lines: &[&str]) -> Option<PowerDevice> {
    let first = lines.first()?;
    let dev_path = first.strip_prefix("Device: ")?.trim();

    // Ignore synthetic aggregation DisplayDevice
    if dev_path.ends_with("/DisplayDevice") {
        return None;
    }

    let id = dev_path.rsplit('/').next().unwrap_or(dev_path).to_string();

    let mut props = std::collections::HashMap::new();
    let mut history_charge = Vec::new();
    let mut history_rate = Vec::new();
    let mut history_voltage = Vec::new();
    let mut current_history_mode: Option<&str> = None;

    for line in lines.iter().skip(1) {
        let trimmed = line.trim();
        if trimmed.starts_with("History (charge):") {
            current_history_mode = Some("charge");
            continue;
        } else if trimmed.starts_with("History (rate):") {
            current_history_mode = Some("rate");
            continue;
        } else if trimmed.starts_with("History (voltage):") {
            current_history_mode = Some("voltage");
            continue;
        } else if trimmed.starts_with("History (") || trimmed.starts_with("Daemon:") {
            current_history_mode = None;
            continue;
        }

        if let Some(mode) = current_history_mode {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 2 {
                if let (Ok(ts), Ok(val)) = (parts[0].parse::<i64>(), parts[1].parse::<f64>()) {
                    let st = parts.get(2).copied().unwrap_or("").to_string();
                    let pt = PowerHistoryPoint {
                        timestamp: ts,
                        value: val,
                        state: st,
                    };
                    match mode {
                        "charge" => history_charge.push(pt),
                        "rate" => history_rate.push(pt),
                        "voltage" => history_voltage.push(pt),
                        _ => {}
                    }
                }
            }
            continue;
        }

        if let Some((k, v)) = line.split_once(':') {
            props.insert(k.trim().to_string(), v.trim().to_string());
        }
    }

    let native_path = props
        .get("native-path")
        .cloned()
        .unwrap_or_else(|| id.clone());

    let is_battery = id.starts_with("battery_") || props.contains_key("percentage");
    let is_line_power = id.starts_with("line_power_") || props.contains_key("online");

    let kind = if is_battery {
        "battery".to_string()
    } else if is_line_power {
        "line_power".to_string()
    } else {
        "other".to_string()
    };

    let name = if is_battery {
        "Laptop battery".to_string()
    } else if is_line_power {
        "AC adapter".to_string()
    } else {
        props
            .get("model")
            .cloned()
            .unwrap_or_else(|| native_path.clone())
    };

    let state = props.get("state").cloned();
    let is_online = props.get("online").map(|s| s == "yes");

    let percentage = props
        .get("percentage")
        .and_then(|s| s.trim_end_matches('%').trim().parse::<f64>().ok());

    let capacity_health = props
        .get("capacity")
        .and_then(|s| s.trim_end_matches('%').trim().parse::<f64>().ok());

    let parse_unit_val = |key: &str| -> Option<f64> {
        props.get(key).and_then(|s| {
            s.split_whitespace()
                .next()
                .and_then(|num| num.parse::<f64>().ok())
        })
    };

    let energy_wh = parse_unit_val("energy");
    let energy_full_wh = parse_unit_val("energy-full");
    let energy_design_wh = parse_unit_val("energy-full-design");
    let rate_w = parse_unit_val("energy-rate");
    let voltage_v = parse_unit_val("voltage");

    let time_to_full = props.get("time to full").cloned();
    let time_to_empty = props.get("time to empty").cloned();

    let vendor = props.get("vendor").cloned();
    let model = props.get("model").cloned();
    let serial = props.get("serial").cloned();
    let technology = props.get("technology").map(|t| title_case_tech(t));
    let cycle_count = props
        .get("charge-cycles")
        .and_then(|s| s.parse::<u32>().ok());

    // Extract refreshed string (e.g. from "Mon 26 Oct ... (28 seconds ago)")
    let refreshed = props.get("updated").map(|u| {
        if let Some(start) = u.find('(') {
            if let Some(end) = u.find(" ago)") {
                return u[start + 1..end].trim().to_string();
            }
        }
        "Recently".to_string()
    });

    let icon = if is_line_power {
        "ac-adapter".to_string()
    } else if is_battery {
        match state.as_deref() {
            Some("charging") => "battery-charging".to_string(),
            _ => "battery".to_string(),
        }
    } else {
        "device".to_string()
    };

    // Format attributes table identical to GNOME Power Statistics
    let mut attributes = Vec::new();

    let add_attr = |attrs: &mut Vec<PowerAttribute>, key: &str, label: &str, val: String| {
        attrs.push(PowerAttribute {
            key: key.to_string(),
            label: label.to_string(),
            value: val,
        });
    };

    if is_line_power {
        add_attr(&mut attributes, "device", "Device", id.clone());
        add_attr(&mut attributes, "type", "Type", "AC adapter".to_string());
        add_attr(
            &mut attributes,
            "supply",
            "Supply",
            props
                .get("power supply")
                .map(|s| title_case(s))
                .unwrap_or_else(|| "Yes".to_string()),
        );
        add_attr(
            &mut attributes,
            "refreshed",
            "Refreshed",
            refreshed.clone().unwrap_or_else(|| "Just now".to_string()),
        );
        add_attr(
            &mut attributes,
            "online",
            "Online",
            if is_online.unwrap_or(false) {
                "Yes".to_string()
            } else {
                "No".to_string()
            },
        );
    } else if is_battery {
        add_attr(&mut attributes, "device", "Device", id.clone());
        add_attr(
            &mut attributes,
            "type",
            "Type",
            "Laptop battery".to_string(),
        );
        if let Some(ref v) = vendor {
            add_attr(&mut attributes, "vendor", "Vendor", v.clone());
        }
        if let Some(ref m) = model {
            add_attr(&mut attributes, "model", "Model", m.clone());
        }
        if let Some(ref s) = serial {
            add_attr(&mut attributes, "serial", "Serial number", s.clone());
        }
        add_attr(
            &mut attributes,
            "supply",
            "Supply",
            props
                .get("power supply")
                .map(|s| title_case(s))
                .unwrap_or_else(|| "Yes".to_string()),
        );
        add_attr(
            &mut attributes,
            "refreshed",
            "Refreshed",
            refreshed
                .clone()
                .unwrap_or_else(|| "23 seconds".to_string()),
        );
        add_attr(
            &mut attributes,
            "present",
            "Present",
            props
                .get("present")
                .map(|s| title_case(s))
                .unwrap_or_else(|| "Yes".to_string()),
        );
        add_attr(
            &mut attributes,
            "rechargeable",
            "Rechargeable",
            props
                .get("rechargeable")
                .map(|s| title_case(s))
                .unwrap_or_else(|| "Yes".to_string()),
        );
        if let Some(ref st) = state {
            add_attr(&mut attributes, "state", "State", title_case(st));
        }
        if let Some(wh) = energy_wh {
            add_attr(&mut attributes, "energy", "Energy", format!("{wh:.1} Wh"));
        }
        add_attr(
            &mut attributes,
            "energy-empty",
            "Energy when empty",
            "0.0 Wh".to_string(),
        );
        if let Some(wh) = energy_full_wh {
            add_attr(
                &mut attributes,
                "energy-full",
                "Energy when full",
                format!("{wh:.1} Wh"),
            );
        }
        if let Some(wh) = energy_design_wh {
            add_attr(
                &mut attributes,
                "energy-design",
                "Energy (design)",
                format!("{wh:.1} Wh"),
            );
        }
        if let Some(r) = rate_w {
            add_attr(&mut attributes, "rate", "Rate", format!("{r:.1} W"));
        }
        if let Some(v) = voltage_v {
            add_attr(&mut attributes, "voltage", "Voltage", format!("{v:.1} V"));
        }
        if let Some(ref ttf) = time_to_full {
            add_attr(&mut attributes, "time-to-full", "Time to full", ttf.clone());
        }
        if let Some(ref tte) = time_to_empty {
            add_attr(
                &mut attributes,
                "time-to-empty",
                "Time to empty",
                tte.clone(),
            );
        } else if state.as_deref() == Some("charging") {
            add_attr(
                &mut attributes,
                "time-to-empty",
                "Time to empty",
                "0 seconds".to_string(),
            );
        }
        if let Some(p) = percentage {
            add_attr(
                &mut attributes,
                "percentage",
                "Percentage",
                format!("{p:.1}%"),
            );
        }
        if let Some(c) = capacity_health {
            add_attr(&mut attributes, "capacity", "Capacity", format!("{c:.1}%"));
        }
        if let Some(ref tech) = technology {
            add_attr(&mut attributes, "technology", "Technology", tech.clone());
        }
        if let Some(cc) = cycle_count {
            add_attr(
                &mut attributes,
                "cycle-count",
                "Charge cycles",
                cc.to_string(),
            );
        }
    } else {
        add_attr(&mut attributes, "device", "Device", id.clone());
        add_attr(&mut attributes, "type", "Type", name.clone());
        if let Some(ref v) = vendor {
            add_attr(&mut attributes, "vendor", "Vendor", v.clone());
        }
        if let Some(ref m) = model {
            add_attr(&mut attributes, "model", "Model", m.clone());
        }
        if let Some(p) = percentage {
            add_attr(
                &mut attributes,
                "percentage",
                "Percentage",
                format!("{p:.1}%"),
            );
        }
    }

    Some(PowerDevice {
        id,
        native_path,
        name,
        kind,
        icon,
        is_online,
        state,
        percentage,
        capacity_health,
        energy_wh,
        energy_full_wh,
        energy_design_wh,
        rate_w,
        voltage_v,
        time_to_full,
        time_to_empty,
        vendor,
        model,
        serial,
        technology,
        refreshed,
        cycle_count,
        attributes,
        charge_history: history_charge,
        rate_history: history_rate,
        voltage_history: history_voltage,
    })
}

fn parse_sysfs_power_supply() -> Vec<PowerDevice> {
    let mut devices = Vec::new();
    let base = Path::new("/sys/class/power_supply");
    let entries = match fs::read_dir(base) {
        Ok(e) => e,
        Err(_) => return devices,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let uevent_file = path.join("uevent");
        let content = match fs::read_to_string(&uevent_file) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut kv = std::collections::HashMap::new();
        for line in content.lines() {
            if let Some((k, v)) = line.split_once('=') {
                kv.insert(k.trim().to_string(), v.trim().to_string());
            }
        }

        let name_str = entry.file_name().to_string_lossy().to_string();
        let psy_type = kv.get("POWER_SUPPLY_TYPE").cloned().unwrap_or_default();

        let is_mains = psy_type == "Mains";
        let is_battery = psy_type == "Battery";

        let kind = if is_mains {
            "line_power".to_string()
        } else if is_battery {
            "battery".to_string()
        } else {
            "other".to_string()
        };

        let id = format!(
            "{}_{name_str}",
            if is_mains { "line_power" } else { "battery" }
        );
        let dev_name = if is_battery {
            "Laptop battery".to_string()
        } else if is_mains {
            "AC adapter".to_string()
        } else {
            name_str.clone()
        };

        let is_online = kv.get("POWER_SUPPLY_ONLINE").map(|s| s == "1");
        let state = kv.get("POWER_SUPPLY_STATUS").map(|s| s.to_lowercase());

        let read_float_scale = |key: &str, scale: f64| -> Option<f64> {
            kv.get(key)
                .and_then(|s| s.parse::<f64>().ok())
                .map(|v| v / scale)
        };

        let energy_wh = read_float_scale("POWER_SUPPLY_ENERGY_NOW", 1_000_000.0);
        let energy_full_wh = read_float_scale("POWER_SUPPLY_ENERGY_FULL", 1_000_000.0);
        let energy_design_wh = read_float_scale("POWER_SUPPLY_ENERGY_FULL_DESIGN", 1_000_000.0);
        let rate_w = read_float_scale("POWER_SUPPLY_POWER_NOW", 1_000_000.0);
        let voltage_v = read_float_scale("POWER_SUPPLY_VOLTAGE_NOW", 1_000_000.0);
        let percentage = kv
            .get("POWER_SUPPLY_CAPACITY")
            .and_then(|s| s.parse::<f64>().ok());

        let capacity_health = match (energy_full_wh, energy_design_wh) {
            (Some(full), Some(design)) if design > 0.0 => Some((full / design) * 100.0),
            _ => None,
        };

        let time_to_full = match (state.as_deref(), energy_wh, energy_full_wh, rate_w) {
            (Some("charging"), Some(now), Some(full), Some(rate)) if rate > 0.1 && full > now => {
                let mins = ((full - now) / rate) * 60.0;
                Some(format!("{mins:.1} minutes"))
            }
            _ => None,
        };

        let time_to_empty = match (state.as_deref(), energy_wh, rate_w) {
            (Some("discharging"), Some(now), Some(rate)) if rate > 0.1 => {
                let mins = (now / rate) * 60.0;
                Some(format!("{mins:.1} minutes"))
            }
            (Some("charging"), _, _) => Some("0 seconds".to_string()),
            _ => None,
        };

        let vendor = kv.get("POWER_SUPPLY_MANUFACTURER").cloned();
        let model = kv.get("POWER_SUPPLY_MODEL_NAME").cloned();
        let serial = kv.get("POWER_SUPPLY_SERIAL_NUMBER").cloned();
        let technology = kv
            .get("POWER_SUPPLY_TECHNOLOGY")
            .map(|t| title_case_tech(t));
        let cycle_count = kv
            .get("POWER_SUPPLY_CYCLE_COUNT")
            .and_then(|s| s.parse::<u32>().ok());

        let icon = if is_mains {
            "ac-adapter".to_string()
        } else if is_battery {
            if state.as_deref() == Some("charging") {
                "battery-charging".to_string()
            } else {
                "battery".to_string()
            }
        } else {
            "device".to_string()
        };

        let mut attributes = Vec::new();
        let add_attr = |attrs: &mut Vec<PowerAttribute>, key: &str, label: &str, val: String| {
            attrs.push(PowerAttribute {
                key: key.to_string(),
                label: label.to_string(),
                value: val,
            });
        };

        if is_mains {
            add_attr(&mut attributes, "device", "Device", id.clone());
            add_attr(&mut attributes, "type", "Type", "AC adapter".to_string());
            add_attr(&mut attributes, "supply", "Supply", "Yes".to_string());
            add_attr(
                &mut attributes,
                "refreshed",
                "Refreshed",
                "Just now".to_string(),
            );
            add_attr(
                &mut attributes,
                "online",
                "Online",
                if is_online.unwrap_or(false) {
                    "Yes".to_string()
                } else {
                    "No".to_string()
                },
            );
        } else if is_battery {
            add_attr(&mut attributes, "device", "Device", id.clone());
            add_attr(
                &mut attributes,
                "type",
                "Type",
                "Laptop battery".to_string(),
            );
            if let Some(ref v) = vendor {
                add_attr(&mut attributes, "vendor", "Vendor", v.clone());
            }
            if let Some(ref m) = model {
                add_attr(&mut attributes, "model", "Model", m.clone());
            }
            if let Some(ref s) = serial {
                add_attr(&mut attributes, "serial", "Serial number", s.clone());
            }
            add_attr(&mut attributes, "supply", "Supply", "Yes".to_string());
            add_attr(
                &mut attributes,
                "refreshed",
                "Refreshed",
                "Just now".to_string(),
            );
            add_attr(&mut attributes, "present", "Present", "Yes".to_string());
            add_attr(
                &mut attributes,
                "rechargeable",
                "Rechargeable",
                "Yes".to_string(),
            );
            if let Some(ref st) = state {
                add_attr(&mut attributes, "state", "State", title_case(st));
            }
            if let Some(wh) = energy_wh {
                add_attr(&mut attributes, "energy", "Energy", format!("{wh:.1} Wh"));
            }
            add_attr(
                &mut attributes,
                "energy-empty",
                "Energy when empty",
                "0.0 Wh".to_string(),
            );
            if let Some(wh) = energy_full_wh {
                add_attr(
                    &mut attributes,
                    "energy-full",
                    "Energy when full",
                    format!("{wh:.1} Wh"),
                );
            }
            if let Some(wh) = energy_design_wh {
                add_attr(
                    &mut attributes,
                    "energy-design",
                    "Energy (design)",
                    format!("{wh:.1} Wh"),
                );
            }
            if let Some(r) = rate_w {
                add_attr(&mut attributes, "rate", "Rate", format!("{r:.1} W"));
            }
            if let Some(v) = voltage_v {
                add_attr(&mut attributes, "voltage", "Voltage", format!("{v:.1} V"));
            }
            if let Some(ref ttf) = time_to_full {
                add_attr(&mut attributes, "time-to-full", "Time to full", ttf.clone());
            }
            if let Some(ref tte) = time_to_empty {
                add_attr(
                    &mut attributes,
                    "time-to-empty",
                    "Time to empty",
                    tte.clone(),
                );
            }
            if let Some(p) = percentage {
                add_attr(
                    &mut attributes,
                    "percentage",
                    "Percentage",
                    format!("{p:.1}%"),
                );
            }
            if let Some(c) = capacity_health {
                add_attr(&mut attributes, "capacity", "Capacity", format!("{c:.1}%"));
            }
            if let Some(ref tech) = technology {
                add_attr(&mut attributes, "technology", "Technology", tech.clone());
            }
            if let Some(cc) = cycle_count {
                add_attr(
                    &mut attributes,
                    "cycle-count",
                    "Charge cycles",
                    cc.to_string(),
                );
            }
        }

        devices.push(PowerDevice {
            id,
            native_path: name_str,
            name: dev_name,
            kind,
            icon,
            is_online,
            state,
            percentage,
            capacity_health,
            energy_wh,
            energy_full_wh,
            energy_design_wh,
            rate_w,
            voltage_v,
            time_to_full,
            time_to_empty,
            vendor,
            model,
            serial,
            technology,
            refreshed: Some("Just now".to_string()),
            cycle_count,
            attributes,
            charge_history: Vec::new(),
            rate_history: Vec::new(),
            voltage_history: Vec::new(),
        });
    }

    devices
}

fn title_case(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}

fn title_case_tech(s: &str) -> String {
    let lower = s.to_lowercase();
    if lower.contains("poly") {
        "Lithium Polymer".to_string()
    } else if lower.contains("ion") {
        "Lithium Ion".to_string()
    } else if lower.contains("lead") {
        "Lead Acid".to_string()
    } else {
        title_case(s)
    }
}
