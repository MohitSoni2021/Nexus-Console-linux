use crate::commands::packages::{OutdatedDto, PackageDto, PackageInfo};
use crate::error::{AppError, AppResult};
use std::process::Command;

pub fn list_packages_dnf() -> AppResult<Vec<PackageDto>> {
    let out = Command::new("rpm")
        .args(["-qa", "--qf", "%{NAME}|%{VERSION}-%{RELEASE}\n"])
        .output()
        .map_err(|e| AppError::Shell(format!("rpm failed: {e}")))?;

    if !out.status.success() {
        return Err(AppError::Shell("failed to list rpm packages".into()));
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let mut packages = Vec::new();

    for line in text.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 2 {
            packages.push(PackageDto {
                name: parts[0].to_string(),
                version: parts[1].to_string(),
                kind: "rpm".to_string(),
                outdated: false,
                latest_version: None,
                pinned: false,
            });
        }
    }

    packages.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(packages)
}

pub fn packages_outdated_dnf() -> AppResult<Vec<OutdatedDto>> {
    // dnf check-update returns exit code 100 when upgrades are available, 0 when none.
    let out = Command::new("dnf")
        .args(["check-update", "-q"])
        .output()
        .map_err(|e| AppError::Shell(format!("dnf check-update failed: {e}")))?;

    let code = out.status.code().unwrap_or(0);
    if code != 0 && code != 100 {
        return Ok(Vec::new());
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let mut outdated = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("Upgrades") {
            continue;
        }
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() >= 2 {
            let full_name = parts[0];
            let name = full_name
                .rsplit_once('.')
                .map(|(n, _)| n)
                .unwrap_or(full_name);
            let latest = parts[1].to_string();
            outdated.push(OutdatedDto {
                name: name.to_string(),
                latest_version: Some(latest),
                pinned: false,
            });
        }
    }

    Ok(outdated)
}

pub fn package_info_dnf(name: &str) -> AppResult<PackageInfo> {
    let out = Command::new("rpm")
        .args(["-qi", name])
        .output()
        .map_err(|e| AppError::Shell(format!("rpm -qi failed: {e}")))?;

    if !out.status.success() {
        return Err(AppError::NotFound(format!("package {name} not found")));
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let mut version = None;
    let mut url = None;
    let mut description = String::new();
    let mut in_desc = false;

    for line in text.lines() {
        if line.starts_with("Version") {
            version = line.split(':').nth(1).map(|v| v.trim().to_string());
        } else if line.starts_with("URL") {
            url = line.split_once(':').map(|(_, u)| u.trim().to_string());
        } else if line.starts_with("Description") {
            in_desc = true;
            continue;
        }

        if in_desc {
            if !description.is_empty() {
                description.push(' ');
            }
            description.push_str(line.trim());
        }
    }

    let deps = package_dependents_dnf(name).unwrap_or_default();

    Ok(PackageInfo {
        name: name.to_string(),
        description: if description.is_empty() {
            None
        } else {
            Some(description)
        },
        homepage: url,
        version,
        dependencies: deps,
        is_service: false,
        is_cask: false,
        kind: Some("rpm".into()),
    })
}

pub fn package_dependents_dnf(name: &str) -> AppResult<Vec<String>> {
    let out = Command::new("rpm")
        .args(["-q", "--whatrequires", name])
        .output()
        .map_err(|e| AppError::Shell(format!("rpm --whatrequires failed: {e}")))?;

    if !out.status.success() {
        return Ok(Vec::new());
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let mut deps = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() && !trimmed.starts_with("no package requires") {
            deps.push(trimmed.to_string());
        }
    }
    Ok(deps)
}

pub fn upgrade_package_dnf(name: &str) -> AppResult<()> {
    let out = Command::new("pkexec")
        .args(["dnf", "upgrade", "-y", name])
        .output()
        .map_err(|e| AppError::Shell(format!("pkexec dnf upgrade failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn upgrade_all_packages_dnf() -> AppResult<()> {
    let out = Command::new("pkexec")
        .args(["dnf", "upgrade", "-y"])
        .output()
        .map_err(|e| AppError::Shell(format!("pkexec dnf upgrade failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn install_package_dnf(name: &str) -> AppResult<()> {
    let out = Command::new("pkexec")
        .args(["dnf", "install", "-y", name])
        .output()
        .map_err(|e| AppError::Shell(format!("pkexec dnf install failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn uninstall_package_dnf(name: &str) -> AppResult<()> {
    let out = Command::new("pkexec")
        .args(["dnf", "remove", "-y", name])
        .output()
        .map_err(|e| AppError::Shell(format!("pkexec dnf remove failed: {e}")))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&out.stderr).into_owned(),
        ))
    }
}

pub fn search_packages_dnf(query: &str) -> AppResult<Vec<String>> {
    let out = Command::new("dnf")
        .args(["repoquery", "-q", "--qf", "%{NAME}", &format!("*{query}*")])
        .output()
        .map_err(|e| AppError::Shell(format!("dnf repoquery failed: {e}")))?;

    if !out.status.success() {
        return Ok(Vec::new());
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let mut results: Vec<String> = text
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .map(String::from)
        .collect();

    results.sort_unstable();
    results.dedup();
    results.truncate(50);
    Ok(results)
}
