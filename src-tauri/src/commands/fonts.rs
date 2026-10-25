use crate::error::AppResult;
use std::collections::BTreeSet;
use std::process::Command;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemFontsDto {
    pub ui_fonts: Vec<String>,
    pub mono_fonts: Vec<String>,
}

#[tauri::command]
pub async fn get_system_fonts() -> AppResult<SystemFontsDto> {
    tauri::async_runtime::spawn_blocking(resolve_system_fonts)
        .await
        .map_err(|e| crate::error::AppError::Shell(format!("font discovery failed: {e}")))?
}

fn resolve_system_fonts() -> AppResult<SystemFontsDto> {
    #[cfg(target_os = "linux")]
    {
        resolve_linux_fonts()
    }
    #[cfg(not(target_os = "linux"))]
    {
        resolve_macos_fonts()
    }
}

#[cfg(target_os = "linux")]
fn resolve_linux_fonts() -> AppResult<SystemFontsDto> {
    let out = Command::new("fc-list")
        .args([":", "family", "spacing"])
        .output();

    let mut ui_fonts = BTreeSet::new();
    let mut mono_fonts = BTreeSet::new();

    if let Ok(out) = out {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let mut parts = trimmed.split(':');
                let family_part = parts.next().unwrap_or("");
                let spacing_part = parts.next().unwrap_or("");

                let family = family_part.split(',').next().unwrap_or("").trim();
                if family.is_empty() || family.starts_with('.') {
                    continue;
                }

                let is_mono = spacing_part.contains("spacing=100")
                    || spacing_part.contains("spacing=110")
                    || family.contains("Mono")
                    || family.contains("Code")
                    || family.contains("Console")
                    || family.contains("Typewriter");

                if is_mono {
                    mono_fonts.insert(family.to_string());
                } else {
                    ui_fonts.insert(family.to_string());
                }
            }
        }
    }

    if ui_fonts.is_empty() {
        for f in &[
            "Cantarell",
            "Inter",
            "Ubuntu",
            "Noto Sans",
            "Roboto",
            "Adwaita Sans",
        ] {
            ui_fonts.insert(f.to_string());
        }
    }
    if mono_fonts.is_empty() {
        for f in &[
            "JetBrains Mono",
            "Fira Code",
            "Cascadia Code",
            "Source Code Pro",
            "Adwaita Mono",
        ] {
            mono_fonts.insert(f.to_string());
        }
    }

    Ok(SystemFontsDto {
        ui_fonts: ui_fonts.into_iter().collect(),
        mono_fonts: mono_fonts.into_iter().collect(),
    })
}

#[cfg(not(target_os = "linux"))]
fn resolve_macos_fonts() -> AppResult<SystemFontsDto> {
    let mut ui_fonts = BTreeSet::new();
    let mut mono_fonts = BTreeSet::new();

    for f in &[
        "SF Pro",
        "Helvetica Neue",
        "Arial",
        "Avenir",
        "Avenir Next",
        "Charter",
        "Gill Sans",
        "Helvetica",
        "Optima",
        "Palatino",
        "PingFang SC",
        "Trebuchet MS",
        "Verdana",
    ] {
        ui_fonts.insert(f.to_string());
    }

    for f in &[
        "SF Mono",
        "Menlo",
        "Monaco",
        "Courier New",
        "PT Mono",
        "Andale Mono",
    ] {
        mono_fonts.insert(f.to_string());
    }

    if let Ok(out) = Command::new("fc-list")
        .args([":", "family", "spacing"])
        .output()
    {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let mut parts = trimmed.split(':');
                let family_part = parts.next().unwrap_or("");
                let spacing_part = parts.next().unwrap_or("");
                let family = family_part.split(',').next().unwrap_or("").trim();
                if family.is_empty() || family.starts_with('.') {
                    continue;
                }
                let is_mono = spacing_part.contains("spacing=100")
                    || spacing_part.contains("spacing=110")
                    || family.contains("Mono")
                    || family.contains("Code")
                    || family.contains("Console");
                if is_mono {
                    mono_fonts.insert(family.to_string());
                } else {
                    ui_fonts.insert(family.to_string());
                }
            }
        }
    }

    Ok(SystemFontsDto {
        ui_fonts: ui_fonts.into_iter().collect(),
        mono_fonts: mono_fonts.into_iter().collect(),
    })
}
