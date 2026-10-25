use crate::commands::services::ServiceDto;
use crate::error::{AppError, AppResult};
use crate::util::{lsof, ps};
use std::collections::HashMap;
use std::process::Command;

#[derive(Default, Debug)]
struct UnitInfo {
    id: String,
    active_state: String,
    sub_state: String,
    main_pid: u32,
}

pub fn list_services_systemd(with_stats: bool) -> AppResult<Vec<ServiceDto>> {
    let out = Command::new("systemctl")
        .args([
            "--user",
            "show",
            "*.service",
            "-p",
            "Id,MainPID,ActiveState,SubState",
        ])
        .output()
        .map_err(|e| AppError::Shell(format!("systemctl show failed: {e}")))?;

    if !out.status.success() {
        return Err(AppError::Shell(
            "failed to query systemd user services".into(),
        ));
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let mut units: Vec<UnitInfo> = Vec::new();
    let mut current = UnitInfo::default();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !current.id.is_empty() {
                units.push(std::mem::take(&mut current));
            }
            continue;
        }

        if let Some((k, v)) = trimmed.split_once('=') {
            match k {
                "Id" => current.id = v.to_string(),
                "ActiveState" => current.active_state = v.to_string(),
                "SubState" => current.sub_state = v.to_string(),
                "MainPID" => current.main_pid = v.parse().unwrap_or(0),
                _ => {}
            }
        }
    }
    if !current.id.is_empty() {
        units.push(current);
    }

    let mut pids: HashMap<String, u32> = HashMap::new();
    for u in &units {
        if u.main_pid > 0 {
            pids.insert(u.id.clone(), u.main_pid);
        }
    }

    let (samples, listen_ports) = if with_stats && !pids.is_empty() {
        let ids: Vec<String> = pids.values().map(u32::to_string).collect();
        (
            ps::parse_ps(&run_ps(&ids)),
            lsof::parse_listening_ports(&run_lsof(&ids)),
        )
    } else {
        Default::default()
    };

    let mut services = Vec::new();
    for u in units {
        let name = u.id.strip_suffix(".service").unwrap_or(&u.id).to_string();

        let (status, healthy) = match (u.active_state.as_str(), u.sub_state.as_str()) {
            ("active", "running") => ("started", true),
            ("activating", _) => ("starting", false),
            ("failed", _) => ("error", false),
            _ => ("stopped", false),
        };

        let pid = if u.main_pid > 0 {
            Some(u.main_pid)
        } else {
            None
        };
        let sample = pid.and_then(|p| samples.get(&p));
        let port = pid.and_then(|p| listen_ports.get(&p).copied());

        services.push(ServiceDto {
            name,
            status: status.to_string(),
            pid,
            cpu: sample.map(|s| s.cpu),
            memory_bytes: sample.map(|s| s.rss_bytes),
            uptime_secs: sample.map(|s| s.uptime_secs),
            port,
            healthy: Some(healthy),
            plist: None,
        });
    }

    services.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(services)
}

pub fn start_service_systemd(name: &str) -> AppResult<()> {
    let unit = if name.ends_with(".service") {
        name.to_string()
    } else {
        format!("{name}.service")
    };
    let out = Command::new("systemctl")
        .args(["--user", "start", &unit])
        .output()
        .map_err(|e| AppError::Shell(format!("systemctl start failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn stop_service_systemd(name: &str) -> AppResult<()> {
    let unit = if name.ends_with(".service") {
        name.to_string()
    } else {
        format!("{name}.service")
    };
    let out = Command::new("systemctl")
        .args(["--user", "stop", &unit])
        .output()
        .map_err(|e| AppError::Shell(format!("systemctl stop failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn restart_service_systemd(name: &str) -> AppResult<()> {
    let unit = if name.ends_with(".service") {
        name.to_string()
    } else {
        format!("{name}.service")
    };
    let out = Command::new("systemctl")
        .args(["--user", "restart", &unit])
        .output()
        .map_err(|e| AppError::Shell(format!("systemctl restart failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

fn run_ps(ids: &[String]) -> String {
    Command::new("ps")
        .args(["-o", "pid=,%cpu=,rss=,etime=", "-p", &ids.join(",")])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
        .unwrap_or_default()
}

fn run_lsof(ids: &[String]) -> String {
    Command::new("lsof")
        .args([
            "-nP",
            "-iTCP",
            "-sTCP:LISTEN",
            "-FpPn",
            "-p",
            &ids.join(","),
        ])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
        .unwrap_or_default()
}
