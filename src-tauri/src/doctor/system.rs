// Phase 1 (trimmed by CTO review) — the 4 high-signal macOS System Health
// probes: low_power_mode, memory_truth, startup_items, backup_risk.
// All read-only shell-outs to Apple's own tools; nothing here wakes a daemon
// or mutates state. Parsers are pure fns with fixture tests.
// Deferred: battery_health, sleep_blockers, thermal, spotlight (low signal).

#![allow(dead_code)]
use super::{probe_failed, Finding, Platform, Probe, Scope, Severity, Tag};
use std::process::Command;

const MACOS: &[Platform] = &[Platform::MacOs];
const UNIX: &[Platform] = &[Platform::MacOs, Platform::Linux];

fn always() -> bool {
    true
}

pub const LOW_POWER_MODE: Probe = Probe {
    id: "low_power_mode",
    scope: Scope::System,
    platforms: UNIX,
    available: always,
    run: run_low_power,
};

pub const MEMORY_TRUTH: Probe = Probe {
    id: "memory_truth",
    scope: Scope::System,
    platforms: UNIX,
    available: always,
    run: run_memory_truth,
};

pub const BACKUP_RISK: Probe = Probe {
    id: "backup_risk",
    scope: Scope::System,
    platforms: MACOS,
    available: always,
    run: run_backup_risk,
};

pub const STARTUP_ITEMS: Probe = Probe {
    id: "startup_items",
    scope: Scope::Startup,
    platforms: UNIX,
    available: always,
    run: run_startup_items,
};

/// stdout on success only — for tools whose failure means "couldn't read".
fn sh(cmd: &str, args: &[&str]) -> Option<String> {
    let out = Command::new(cmd).args(args).output().ok()?;
    out.status
        .success()
        .then(|| String::from_utf8_lossy(&out.stdout).into_owned())
}

/// stdout+stderr regardless of exit code — tmutil "fails" when unconfigured,
/// which is exactly the state we want to detect.
fn sh_any(cmd: &str, args: &[&str]) -> Option<String> {
    let out = Command::new(cmd).args(args).output().ok()?;
    let mut s = String::from_utf8_lossy(&out.stdout).into_owned();
    s.push_str(&String::from_utf8_lossy(&out.stderr));
    Some(s)
}

// --- low_power_mode ----------------------------------------------------------

fn parse_low_power(pmset_g: &str) -> Option<bool> {
    let line = pmset_g.lines().find(|l| l.contains("lowpowermode"))?;
    line.split_whitespace().last().map(|v| v == "1")
}

fn run_low_power() -> Vec<Finding> {
    #[cfg(target_os = "linux")]
    {
        if let Some(profile) = sh("powerprofilesctl", &["get"]) {
            let mode = profile.trim();
            let (severity, summary, explain) = if mode == "power-saver" {
                (
                    Severity::Red,
                    "Power Saver mode is ON — CPU is throttled".to_string(),
                    "Power Saver mode slows down CPU cores to extend battery life.".to_string(),
                )
            } else {
                (
                    Severity::Green,
                    format!("Power profile is {mode} (full speed)"),
                    "The CPU runs at full speed without power saving throttling.".to_string(),
                )
            };
            return vec![Finding {
                probe_id: LOW_POWER_MODE.id,
                scope: LOW_POWER_MODE.scope,
                severity,
                tag: Tag::Speed,
                summary,
                explain,
                guide: if severity == Severity::Red {
                    Some(vec![
                        "Open GNOME Settings → Power".into(),
                        "Switch power profile to Balanced or Performance".into(),
                    ])
                } else {
                    None
                },
                fix: None,
            }];
        }
        vec![]
    }
    #[cfg(not(target_os = "linux"))]
    {
        let Some(out) = sh("pmset", &["-g"]) else {
            return vec![probe_failed(
                &LOW_POWER_MODE,
                Tag::Speed,
                "read power settings (pmset)",
            )];
        };
        // Key absent (e.g. older desktop Macs) → feature not present, never renders.
        let Some(on) = parse_low_power(&out) else {
            return vec![];
        };
        let f = if on {
            Finding {
                probe_id: LOW_POWER_MODE.id,
                scope: LOW_POWER_MODE.scope,
                severity: Severity::Red,
                tag: Tag::Speed,
                summary: "Low Power Mode is ON — the CPU is being throttled".into(),
                explain: "Low Power Mode saves battery BY slowing the CPU down. If this machine \
                          feels slow, turn this off first — it was the measured root cause of the \
                          original \"my Mac is slow\" case."
                    .into(),
                guide: Some(vec![
                    "Open System Settings → Battery".into(),
                    "Set Low Power Mode to \"Never\" or \"Only on Battery\"".into(),
                ]),
                fix: None,
            }
        } else {
            Finding {
                probe_id: LOW_POWER_MODE.id,
                scope: LOW_POWER_MODE.scope,
                severity: Severity::Green,
                tag: Tag::Speed,
                summary: "Low Power Mode is off".into(),
                explain: "The CPU runs at full speed.".into(),
                guide: None,
                fix: None,
            }
        };
        vec![f]
    }
}

// --- memory_truth ------------------------------------------------------------

const SWAP_YELLOW_MB: f64 = 2048.0;

/// "total = 2048.00M  used = 512.00M  free = 1536.00M  (encrypted)"
fn parse_swap_used_mb(s: &str) -> Option<f64> {
    let rest = s.split("used =").nth(1)?.trim_start();
    let num: String = rest
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    num.parse().ok()
}

/// Kernel pressure level: 1 = normal, 2 = warning, 4 = critical.
fn classify_memory(level: u32, swap_mb: f64) -> Severity {
    if level >= 4 {
        Severity::Red
    } else if level >= 2 || swap_mb > SWAP_YELLOW_MB {
        Severity::Yellow
    } else {
        Severity::Green
    }
}

fn run_memory_truth() -> Vec<Finding> {
    #[cfg(target_os = "linux")]
    {
        if let Ok(meminfo) = std::fs::read_to_string("/proc/meminfo") {
            let mut total_kb: u64 = 0;
            let mut avail_kb: u64 = 0;
            let mut swap_total_kb: u64 = 0;
            let mut swap_free_kb: u64 = 0;
            for line in meminfo.lines() {
                let mut parts = line.split_whitespace();
                let key = parts.next().unwrap_or("");
                let val: u64 = parts.next().and_then(|v| v.parse().ok()).unwrap_or(0);
                match key {
                    "MemTotal:" => total_kb = val,
                    "MemAvailable:" => avail_kb = val,
                    "SwapTotal:" => swap_total_kb = val,
                    "SwapFree:" => swap_free_kb = val,
                    _ => {}
                }
            }
            let swap_used_mb = (swap_total_kb.saturating_sub(swap_free_kb)) as f64 / 1024.0;
            let avail_gb = avail_kb as f64 / 1024.0 / 1024.0;
            let total_gb = total_kb as f64 / 1024.0 / 1024.0;
            let (severity, label) = if avail_gb < 1.0 {
                (Severity::Red, "critical")
            } else if avail_gb < 2.0 || swap_used_mb > 2048.0 {
                (Severity::Yellow, "warning")
            } else {
                (Severity::Green, "normal")
            };
            return vec![Finding {
                probe_id: MEMORY_TRUTH.id,
                scope: MEMORY_TRUTH.scope,
                severity,
                tag: Tag::Speed,
                summary: format!("Memory pressure {label} · swap {swap_used_mb:.0} MB used"),
                explain: format!("{avail_gb:.1} GB of {total_gb:.1} GB memory available. Linux buffer/cache memory is managed automatically."),
                guide: None,
                fix: None,
            }];
        }
        vec![probe_failed(
            &MEMORY_TRUTH,
            Tag::Speed,
            "read memory stats (/proc/meminfo)",
        )]
    }
    #[cfg(not(target_os = "linux"))]
    {
        let level = sh("sysctl", &["-n", "kern.memorystatus_vm_pressure_level"])
            .and_then(|s| s.trim().parse::<u32>().ok());
        let swap = sh("sysctl", &["-n", "vm.swapusage"]).and_then(|s| parse_swap_used_mb(&s));
        let (Some(level), Some(swap_mb)) = (level, swap) else {
            return vec![probe_failed(
                &MEMORY_TRUTH,
                Tag::Speed,
                "read memory pressure (sysctl)",
            )];
        };
        let severity = classify_memory(level, swap_mb);
        let label = match level {
            4.. => "critical",
            2..=3 => "warning",
            _ => "normal",
        };
        let explain = match severity {
            Severity::Green => {
                "\"Free\" RAM near zero is NORMAL on macOS — the honest signals are \
                                swap and the kernel pressure level, and both look fine."
                    .to_string()
            }
            Severity::Yellow if level < 2 => format!(
                "Swap usage is high ({swap_mb:.0} MB). If it keeps growing, something is leaking \
                 memory or the machine is over capacity — check Activity Monitor → Memory."
            ),
            _ => {
                "The kernel is under memory pressure — apps are (or will start) swapping to disk \
                  and everything feels slower. Close the heaviest apps (Activity Monitor → Memory)."
                    .to_string()
            }
        };
        vec![Finding {
            probe_id: MEMORY_TRUTH.id,
            scope: MEMORY_TRUTH.scope,
            severity,
            tag: Tag::Speed,
            summary: format!("Memory pressure {label} · swap {swap_mb:.0} MB used"),
            explain,
            guide: None,
            fix: None,
        }]
    }
}

// --- backup_risk ---------------------------------------------------------------

fn run_backup_risk() -> Vec<Finding> {
    let Some(out) = sh_any("tmutil", &["destinationinfo"]) else {
        return vec![probe_failed(
            &BACKUP_RISK,
            Tag::Info,
            "read Time Machine status (tmutil)",
        )];
    };
    if out.contains("No destinations configured") {
        return vec![Finding {
            probe_id: BACKUP_RISK.id,
            scope: BACKUP_RISK.scope,
            severity: Severity::Yellow,
            tag: Tag::Info,
            summary: "No Time Machine backup configured".into(),
            explain: "Nothing on this machine is backed up — one disk failure loses everything. \
                      Any external disk works as a destination."
                .into(),
            guide: Some(vec![
                "Open System Settings → General → Time Machine".into(),
                "Add a backup destination".into(),
            ]),
            fix: None,
        }];
    }
    if let Some(name) = parse_tm_name(&out) {
        return vec![Finding {
            probe_id: BACKUP_RISK.id,
            scope: BACKUP_RISK.scope,
            severity: Severity::Green,
            tag: Tag::Info,
            summary: format!("Time Machine configured → {name}"),
            explain: "A backup destination is set up.".into(),
            guide: None,
            fix: None,
        }];
    }
    // Fail-safe: unrecognized output shape → say so, never guess.
    vec![probe_failed(
        &BACKUP_RISK,
        Tag::Info,
        "parse Time Machine status",
    )]
}

fn parse_tm_name(s: &str) -> Option<String> {
    let line = s.lines().find(|l| l.trim_start().starts_with("Name"))?;
    let name = line.split(':').nth(1)?.trim();
    (!name.is_empty()).then(|| name.to_string())
}

// --- startup_items ---------------------------------------------------------------

/// Launch agents that watch folders even when nothing uses them.
const NOISY_AGENTS: &[&str] = &["watchman"];
const MAX_LISTED: usize = 12;

/// `launchctl list` → "PID\tStatus\tLabel"; third-party = label not com.apple.*.
fn parse_third_party_labels(s: &str) -> Vec<String> {
    s.lines()
        .skip(1)
        .filter_map(|l| l.split_whitespace().nth(2))
        .filter(|label| !label.starts_with("com.apple."))
        .map(str::to_string)
        .collect()
}

fn run_startup_items() -> Vec<Finding> {
    #[cfg(target_os = "linux")]
    {
        let mut apps = Vec::new();
        if let Some(home) = std::env::var_os("HOME").map(std::path::PathBuf::from) {
            let autostart_dir = home.join(".config/autostart");
            if let Ok(entries) = std::fs::read_dir(autostart_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some("desktop") {
                        if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                            apps.push(stem.to_string());
                        }
                    }
                }
            }
        }
        if apps.is_empty() {
            return vec![Finding {
                probe_id: STARTUP_ITEMS.id,
                scope: STARTUP_ITEMS.scope,
                severity: Severity::Green,
                tag: Tag::Speed,
                summary: "No custom autostart desktop apps".into(),
                explain: "Nothing extra loads automatically on login via ~/.config/autostart."
                    .into(),
                guide: None,
                fix: None,
            }];
        }
        let count = apps.len();
        vec![Finding {
            probe_id: STARTUP_ITEMS.id,
            scope: STARTUP_ITEMS.scope,
            severity: if count > 10 {
                Severity::Yellow
            } else {
                Severity::Green
            },
            tag: Tag::Speed,
            summary: format!("{count} startup app(s) in ~/.config/autostart"),
            explain: format!(
                "Apps launching at login: {}. Manage in GNOME Tweaks / Startup Applications.",
                apps.join(", ")
            ),
            guide: Some(vec!["Open Startup Applications / GNOME Tweaks".into()]),
            fix: None,
        }]
    }
    #[cfg(not(target_os = "linux"))]
    {
        let Some(out) = sh("launchctl", &["list"]) else {
            return vec![probe_failed(
                &STARTUP_ITEMS,
                Tag::Speed,
                "list launch agents (launchctl)",
            )];
        };
        let labels = parse_third_party_labels(&out);
        if labels.is_empty() {
            return vec![Finding {
                probe_id: STARTUP_ITEMS.id,
                scope: STARTUP_ITEMS.scope,
                severity: Severity::Green,
                tag: Tag::Speed,
                summary: "No third-party launch agents".into(),
                explain: "Nothing extra loads at login.".into(),
                guide: None,
                fix: None,
            }];
        }
        let noisy: Vec<&String> = labels
            .iter()
            .filter(|l| NOISY_AGENTS.iter().any(|n| l.to_lowercase().contains(n)))
            .collect();
        let mut listed = labels
            .iter()
            .take(MAX_LISTED)
            .cloned()
            .collect::<Vec<_>>()
            .join(", ");
        if labels.len() > MAX_LISTED {
            listed.push_str(&format!(", … +{}", labels.len() - MAX_LISTED));
        }
        let mut explain = format!(
            "Loaded at login, each costs some CPU/RAM: {listed}. Review anything you don't recognize."
        );
        if !noisy.is_empty() {
            explain.push_str(" Watchman was flagged as noisy in the original session.");
        }
        vec![Finding {
            probe_id: STARTUP_ITEMS.id,
            scope: STARTUP_ITEMS.scope,
            severity: if !noisy.is_empty() || labels.len() > 8 {
                Severity::Yellow
            } else {
                Severity::Green
            },
            tag: Tag::Speed,
            summary: format!("{} third-party launch agent(s)", labels.len()),
            explain,
            guide: Some(vec![
                "Review ~/Library/LaunchAgents and /Library/LaunchAgents".into(),
                "Remove .plist files for unneeded background agents".into(),
            ]),
            fix: None,
        }]
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_low_power_mode() {
        let on = " SleepDisabled\t\t0\n lowpowermode         1\n standby              1";
        let off = " lowpowermode         0";
        assert_eq!(parse_low_power(on), Some(true));
        assert_eq!(parse_low_power(off), Some(false));
        assert_eq!(parse_low_power("no such key here"), None);
    }

    #[test]
    fn parses_swap_used() {
        assert_eq!(
            parse_swap_used_mb("total = 2048.00M  used = 512.50M  free = 1535.50M  (encrypted)"),
            Some(512.5)
        );
        assert_eq!(
            parse_swap_used_mb("vm.swapusage: total = 1024.00M  used = 0.00M  free = 1024.00M"),
            Some(0.0)
        );
        assert_eq!(parse_swap_used_mb("garbage"), None);
    }

    #[test]
    fn memory_thresholds() {
        assert_eq!(classify_memory(1, 0.0), Severity::Green);
        assert_eq!(classify_memory(1, 3000.0), Severity::Yellow);
        assert_eq!(classify_memory(2, 0.0), Severity::Yellow);
        assert_eq!(classify_memory(4, 0.0), Severity::Red);
    }

    #[test]
    fn parses_third_party_labels() {
        let out = "PID\tStatus\tLabel\n\
                   1234\t0\tcom.apple.Finder\n\
                   -\t0\tcom.apple.mdworker.shared\n\
                   567\t0\tcom.facebook.watchman\n\
                   -\t1\thomebrew.mxcl.redis";
        let labels = parse_third_party_labels(out);
        assert_eq!(labels, vec!["com.facebook.watchman", "homebrew.mxcl.redis"]);
    }

    #[test]
    fn parses_tm_destination() {
        let configured = "==================================================\n\
                          Name          : Backup HD\n\
                          Kind          : Local\n";
        assert_eq!(parse_tm_name(configured), Some("Backup HD".into()));
        assert_eq!(parse_tm_name("tmutil: No destinations configured."), None);
    }

    // Real machine, read-only: every probe returns at most one finding and
    // never panics (LPM may return zero on Macs without the setting).
    #[test]
    fn probes_run_on_real_machine() {
        assert!(run_low_power().len() <= 1);
        assert_eq!(run_memory_truth().len(), 1);
        assert_eq!(run_backup_risk().len(), 1);
        assert_eq!(run_startup_items().len(), 1);
    }
}
