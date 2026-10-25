use crate::commands::packages::{OutdatedDto, PackageDto, PackageInfo};
use crate::error::{AppError, AppResult};
use std::process::Command;

pub fn is_flatpak(name: &str) -> bool {
    if !name.contains('.') {
        return false;
    }
    Command::new("flatpak")
        .args(["info", name])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn list_packages_flatpak() -> AppResult<Vec<PackageDto>> {
    let out = Command::new("flatpak")
        .args(["list", "--app", "--columns=application,version,name"])
        .output();

    let out = match out {
        Ok(o) if o.status.success() => o,
        _ => return Ok(Vec::new()),
    };

    let text = String::from_utf8_lossy(&out.stdout);
    let mut packages = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.split('\t').collect();
        if !parts.is_empty() && !parts[0].is_empty() {
            let app_id = parts[0].trim().to_string();
            let version = parts
                .get(1)
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .unwrap_or("stable")
                .to_string();

            packages.push(PackageDto {
                name: app_id,
                version,
                kind: "flatpak".to_string(),
                outdated: false,
                latest_version: None,
                pinned: false,
            });
        }
    }

    packages.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(packages)
}

pub fn packages_outdated_flatpak() -> AppResult<Vec<OutdatedDto>> {
    let out = Command::new("flatpak")
        .args(["remote-ls", "--updates", "--columns=application,version"])
        .output();

    let out = match out {
        Ok(o) if o.status.success() => o,
        _ => return Ok(Vec::new()),
    };

    let text = String::from_utf8_lossy(&out.stdout);
    let mut outdated = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.split('\t').collect();
        if !parts.is_empty() && !parts[0].is_empty() {
            let app_id = parts[0].trim().to_string();
            let version = parts
                .get(1)
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .map(String::from);

            outdated.push(OutdatedDto {
                name: app_id,
                latest_version: version,
                pinned: false,
            });
        }
    }

    Ok(outdated)
}

pub fn package_info_flatpak(name: &str) -> AppResult<PackageInfo> {
    let out = Command::new("flatpak")
        .args(["info", name])
        .output()
        .map_err(|e| AppError::Shell(format!("flatpak info failed: {e}")))?;

    if !out.status.success() {
        return Err(AppError::NotFound(format!("flatpak {name} not found")));
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let mut description = None;
    let mut version = None;
    let mut runtime = None;
    let mut sdk = None;
    let mut origin = None;

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if description.is_none() && !trimmed.contains(':') {
            description = Some(trimmed.to_string());
            continue;
        }
        if let Some((k, v)) = trimmed.split_once(':') {
            let k = k.trim();
            let v = v.trim();
            match k {
                "Version" => version = Some(v.to_string()),
                "Runtime" => runtime = Some(v.to_string()),
                "Sdk" => sdk = Some(v.to_string()),
                "Origin" => origin = Some(v.to_string()),
                _ => {}
            }
        }
    }

    let mut dependencies = Vec::new();
    if let Some(r) = runtime {
        dependencies.push(format!("Runtime: {r}"));
    }
    if let Some(s) = sdk {
        dependencies.push(format!("Sdk: {s}"));
    }

    let homepage = origin.map(|_| format!("https://flathub.org/apps/{name}"));

    Ok(PackageInfo {
        name: name.to_string(),
        description,
        homepage,
        version,
        dependencies,
        is_service: false,
        is_cask: false,
        kind: Some("flatpak".into()),
    })
}

pub fn upgrade_package_flatpak(name: &str) -> AppResult<()> {
    let out = Command::new("flatpak")
        .args(["update", "-y", "--noninteractive", name])
        .output()
        .map_err(|e| AppError::Shell(format!("flatpak update failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn upgrade_all_flatpak() -> AppResult<()> {
    let out = Command::new("flatpak")
        .args(["update", "-y", "--noninteractive"])
        .output()
        .map_err(|e| AppError::Shell(format!("flatpak update failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn uninstall_package_flatpak(name: &str) -> AppResult<()> {
    let out = Command::new("flatpak")
        .args(["uninstall", "-y", "--noninteractive", name])
        .output()
        .map_err(|e| AppError::Shell(format!("flatpak uninstall failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn search_packages_flatpak(query: &str) -> AppResult<Vec<String>> {
    let out = Command::new("flatpak")
        .args(["search", "--columns=application", query])
        .output()
        .map_err(|e| AppError::Shell(format!("flatpak search failed: {e}")))?;

    if !out.status.success() {
        return Ok(Vec::new());
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let results: Vec<String> = text
        .lines()
        .skip(1) // Skip header if present
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with("Application ID"))
        .map(String::from)
        .collect();

    Ok(results)
}
