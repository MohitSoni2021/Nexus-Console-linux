use crate::error::AppResult;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OsInfo {
    pub name: String,
    pub pretty_name: String,
    pub version: String,
    pub id: String,
    pub kernel: String,
    pub arch: String,
    pub hostname: String,
    pub uptime_seconds: u64,
    pub uptime_formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareInfo {
    pub vendor: String,
    pub product_name: String,
    pub product_family: String,
    pub board_vendor: String,
    pub board_name: String,
    pub bios_vendor: String,
    pub bios_version: String,
    pub bios_date: String,
    pub chassis_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub model_name: String,
    pub vendor_id: String,
    pub cores: usize,
    pub threads: usize,
    pub mhz_current: Option<f64>,
    pub mhz_max: Option<f64>,
    pub mhz_min: Option<f64>,
    pub l1d_cache: Option<String>,
    pub l1i_cache: Option<String>,
    pub l2_cache: Option<String>,
    pub l3_cache: Option<String>,
    pub flags_summary: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RamSlotInfo {
    pub locator: String,
    pub bank_locator: Option<String>,
    pub size: String,
    pub slot_type: String,
    pub speed: Option<String>,
    pub manufacturer: Option<String>,
    pub part_number: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub used_percent: f64,
    pub buffers_bytes: u64,
    pub cached_bytes: u64,
    pub swap_total_bytes: u64,
    pub swap_free_bytes: u64,
    pub swap_used_bytes: u64,
    pub swap_used_percent: f64,
    pub memory_blocks_count: usize,
    pub memory_block_size_bytes: u64,
    pub ram_slots: Vec<RamSlotInfo>,
    pub slot_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskPartition {
    pub name: String,
    pub size_bytes: u64,
    pub size_formatted: String,
    pub fstype: Option<String>,
    pub mountpoint: Option<String>,
    pub used_bytes: Option<u64>,
    pub avail_bytes: Option<u64>,
    pub used_percent: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskDevice {
    pub name: String,
    pub model: Option<String>,
    pub size_bytes: u64,
    pub size_formatted: String,
    pub disk_type: String,
    pub rotational: bool,
    pub state: Option<String>,
    pub partitions: Vec<DiskPartition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub name: String,
    pub vendor: String,
    pub pci_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterface {
    pub name: String,
    pub is_up: bool,
    pub is_wireless: bool,
    pub mac_address: Option<String>,
    pub mtu: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    pub os: OsInfo,
    pub hardware: HardwareInfo,
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub disks: Vec<DiskDevice>,
    pub gpus: Vec<GpuInfo>,
    pub network: Vec<NetworkInterface>,
}

fn read_sys_string(path: &str) -> Option<String> {
    fs::read_to_string(path)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn format_bytes(bytes: u64) -> String {
    const KIB: u64 = 1024;
    const MIB: u64 = KIB * 1024;
    const GIB: u64 = MIB * 1024;
    const TIB: u64 = GIB * 1024;

    if bytes >= TIB {
        format!("{:.2} TB", bytes as f64 / TIB as f64)
    } else if bytes >= GIB {
        format!("{:.1} GB", bytes as f64 / GIB as f64)
    } else if bytes >= MIB {
        format!("{:.0} MB", bytes as f64 / MIB as f64)
    } else if bytes >= KIB {
        format!("{:.0} KB", bytes as f64 / KIB as f64)
    } else {
        format!("{} B", bytes)
    }
}

fn format_uptime(secs: u64) -> String {
    let days = secs / 86400;
    let hours = (secs % 86400) / 3600;
    let mins = (secs % 3600) / 60;

    let mut parts = Vec::new();
    if days > 0 {
        parts.push(format!("{}d", days));
    }
    if hours > 0 || days > 0 {
        parts.push(format!("{}h", hours));
    }
    parts.push(format!("{}m", mins));
    parts.join(" ")
}

fn get_os_info() -> OsInfo {
    let mut name = "Linux".to_string();
    let mut pretty_name = "Linux".to_string();
    let mut version = String::new();
    let mut id = "linux".to_string();

    if let Ok(content) = fs::read_to_string("/etc/os-release") {
        for line in content.lines() {
            let line = line.trim();
            if let Some(val) = line.strip_prefix("PRETTY_NAME=") {
                pretty_name = val.trim_matches('"').to_string();
            } else if let Some(val) = line.strip_prefix("NAME=") {
                name = val.trim_matches('"').to_string();
            } else if let Some(val) = line.strip_prefix("VERSION=") {
                version = val.trim_matches('"').to_string();
            } else if let Some(val) = line.strip_prefix("ID=") {
                id = val.trim_matches('"').to_string();
            }
        }
    }

    let kernel = Command::new("uname")
        .arg("-r")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let arch = std::env::consts::ARCH.to_string();

    let hostname = read_sys_string("/proc/sys/kernel/hostname")
        .or_else(|| read_sys_string("/etc/hostname"))
        .unwrap_or_else(|| "localhost".to_string());

    let mut uptime_seconds = 0u64;
    if let Ok(content) = fs::read_to_string("/proc/uptime") {
        if let Some(first) = content.split_whitespace().next() {
            uptime_seconds = first.parse::<f64>().map(|v| v as u64).unwrap_or(0);
        }
    }

    OsInfo {
        name,
        pretty_name,
        version,
        id,
        kernel,
        arch,
        hostname,
        uptime_seconds,
        uptime_formatted: format_uptime(uptime_seconds),
    }
}

fn get_hardware_info() -> HardwareInfo {
    let dmi = "/sys/class/dmi/id";
    let vendor = read_sys_string(&format!("{dmi}/sys_vendor")).unwrap_or_else(|| "Unknown".into());
    let product_name =
        read_sys_string(&format!("{dmi}/product_name")).unwrap_or_else(|| "Unknown".into());
    let product_family =
        read_sys_string(&format!("{dmi}/product_family")).unwrap_or_else(|| product_name.clone());
    let board_vendor =
        read_sys_string(&format!("{dmi}/board_vendor")).unwrap_or_else(|| vendor.clone());
    let board_name =
        read_sys_string(&format!("{dmi}/board_name")).unwrap_or_else(|| "Unknown".into());
    let bios_vendor =
        read_sys_string(&format!("{dmi}/bios_vendor")).unwrap_or_else(|| "Unknown".into());
    let bios_version =
        read_sys_string(&format!("{dmi}/bios_version")).unwrap_or_else(|| "Unknown".into());
    let bios_date =
        read_sys_string(&format!("{dmi}/bios_date")).unwrap_or_else(|| "Unknown".into());

    let chassis_code = read_sys_string(&format!("{dmi}/chassis_type")).unwrap_or_default();
    let chassis_type = match chassis_code.as_str() {
        "3" => "Desktop",
        "8" | "9" | "10" | "14" => "Laptop",
        "11" => "Hand Held",
        "17" => "Main Server Chassis",
        "23" => "Rack Mount Chassis",
        "30" => "Tablet",
        "31" | "32" => "Convertible / Detachable",
        _ => "System Unit",
    }
    .to_string();

    HardwareInfo {
        vendor,
        product_name,
        product_family,
        board_vendor,
        board_name,
        bios_vendor,
        bios_version,
        bios_date,
        chassis_type,
    }
}

fn get_cpu_info() -> CpuInfo {
    let mut model_name = "Unknown CPU".to_string();
    let mut vendor_id = "Unknown".to_string();
    let mut cores_set = std::collections::HashSet::new();
    let mut threads = 0usize;
    let mut mhz_current = None;
    let mut raw_flags = String::new();

    if let Ok(content) = fs::read_to_string("/proc/cpuinfo") {
        for line in content.lines() {
            let line = line.trim();
            if let Some((k, v)) = line.split_once(':') {
                let key = k.trim();
                let val = v.trim();
                if key == "model name" && model_name == "Unknown CPU" {
                    model_name = val.to_string();
                } else if key == "vendor_id" && vendor_id == "Unknown" {
                    vendor_id = val.to_string();
                } else if key == "core id" {
                    cores_set.insert(val.to_string());
                } else if key == "processor" {
                    threads += 1;
                } else if key == "cpu MHz" && mhz_current.is_none() {
                    mhz_current = val.parse::<f64>().ok();
                } else if key == "flags" && raw_flags.is_empty() {
                    raw_flags = val.to_string();
                }
            }
        }
    }

    let cores = if !cores_set.is_empty() {
        cores_set.len()
    } else {
        threads.max(1)
    };

    let mhz_max = read_sys_string("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq")
        .and_then(|s| s.parse::<f64>().ok())
        .map(|khz| khz / 1000.0);

    let mhz_min = read_sys_string("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_min_freq")
        .and_then(|s| s.parse::<f64>().ok())
        .map(|khz| khz / 1000.0);

    let mut l1d_cache = None;
    let mut l1i_cache = None;
    let mut l2_cache = None;
    let mut l3_cache = None;

    for i in 0..6 {
        let base = format!("/sys/devices/system/cpu/cpu0/cache/index{i}");
        if let (Some(level), Some(ctype), Some(size)) = (
            read_sys_string(&format!("{base}/level")),
            read_sys_string(&format!("{base}/type")),
            read_sys_string(&format!("{base}/size")),
        ) {
            match (level.as_str(), ctype.as_str()) {
                ("1", "Data") => l1d_cache = Some(format!("L1d {size}")),
                ("1", "Instruction") => l1i_cache = Some(format!("L1i {size}")),
                ("2", _) => l2_cache = Some(format!("L2 {size}")),
                ("3", _) => l3_cache = Some(format!("L3 {size}")),
                _ => {}
            }
        }
    }

    let mut flags_summary = Vec::new();
    let flag_tokens: std::collections::HashSet<&str> = raw_flags.split_whitespace().collect();
    let wanted = [
        ("lm", "64-bit"),
        ("vmx", "Intel VT-x"),
        ("svm", "AMD-V"),
        ("avx2", "AVX2"),
        ("avx", "AVX"),
        ("aes", "AES-NI"),
        ("sse4_2", "SSE4.2"),
        ("fma", "FMA3"),
        ("sha_ni", "SHA-NI"),
        ("hypervisor", "Virtual Machine"),
    ];
    for (k, label) in wanted {
        if flag_tokens.contains(k) {
            flags_summary.push(label.to_string());
        }
    }

    CpuInfo {
        model_name,
        vendor_id,
        cores,
        threads,
        mhz_current,
        mhz_max,
        mhz_min,
        l1d_cache,
        l1i_cache,
        l2_cache,
        l3_cache,
        flags_summary,
    }
}

fn parse_dmidecode_ram_slots() -> Vec<RamSlotInfo> {
    let output = Command::new("dmidecode").args(["-t", "17"]).output();

    let Ok(output) = output else {
        return Vec::new();
    };

    if !output.status.success() {
        return Vec::new();
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut slots = Vec::new();
    let mut current_locator = String::new();
    let mut current_bank = None;
    let mut current_size = String::new();
    let mut current_type = String::new();
    let mut current_speed = None;
    let mut current_mfr = None;
    let mut current_part = None;

    for line in text.lines() {
        let line = line.trim();
        if line.starts_with("Memory Device") {
            if !current_locator.is_empty() {
                let is_empty =
                    current_size.to_lowercase().contains("no module") || current_size.is_empty();
                slots.push(RamSlotInfo {
                    locator: current_locator.clone(),
                    bank_locator: current_bank.clone(),
                    size: if is_empty {
                        "Empty".into()
                    } else {
                        current_size.clone()
                    },
                    slot_type: if current_type.is_empty() {
                        "Unknown".into()
                    } else {
                        current_type.clone()
                    },
                    speed: current_speed.clone(),
                    manufacturer: current_mfr.clone(),
                    part_number: current_part.clone(),
                    status: if is_empty {
                        "Empty".into()
                    } else {
                        "Installed".into()
                    },
                });
            }
            current_locator.clear();
            current_bank = None;
            current_size.clear();
            current_type.clear();
            current_speed = None;
            current_mfr = None;
            current_part = None;
        } else if let Some(val) = line.strip_prefix("Locator:") {
            current_locator = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("Bank Locator:") {
            current_bank = Some(val.trim().to_string());
        } else if let Some(val) = line.strip_prefix("Size:") {
            current_size = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("Type:") {
            current_type = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("Speed:") {
            let s = val.trim();
            if !s.to_lowercase().contains("unknown") {
                current_speed = Some(s.to_string());
            }
        } else if let Some(val) = line.strip_prefix("Manufacturer:") {
            let m = val.trim();
            if !m.to_lowercase().contains("unknown") && !m.to_lowercase().contains("not specified")
            {
                current_mfr = Some(m.to_string());
            }
        } else if let Some(val) = line.strip_prefix("Part Number:") {
            let p = val.trim();
            if !p.is_empty() && !p.to_lowercase().contains("unknown") {
                current_part = Some(p.to_string());
            }
        }
    }

    if !current_locator.is_empty() {
        let is_empty = current_size.to_lowercase().contains("no module") || current_size.is_empty();
        slots.push(RamSlotInfo {
            locator: current_locator,
            bank_locator: current_bank,
            size: if is_empty {
                "Empty".into()
            } else {
                current_size
            },
            slot_type: if current_type.is_empty() {
                "Unknown".into()
            } else {
                current_type
            },
            speed: current_speed,
            manufacturer: current_mfr,
            part_number: current_part,
            status: if is_empty {
                "Empty".into()
            } else {
                "Installed".into()
            },
        });
    }

    slots
}

fn get_memory_info() -> MemoryInfo {
    let mut total_kb = 0u64;
    let mut free_kb = 0u64;
    let mut avail_kb = 0u64;
    let mut buffers_kb = 0u64;
    let mut cached_kb = 0u64;
    let mut swap_total_kb = 0u64;
    let mut swap_free_kb = 0u64;

    if let Ok(content) = fs::read_to_string("/proc/meminfo") {
        for line in content.lines() {
            let mut parts = line.split_whitespace();
            if let (Some(key), Some(val_str)) = (parts.next(), parts.next()) {
                let val = val_str.parse::<u64>().unwrap_or(0);
                match key {
                    "MemTotal:" => total_kb = val,
                    "MemFree:" => free_kb = val,
                    "MemAvailable:" => avail_kb = val,
                    "Buffers:" => buffers_kb = val,
                    "Cached:" => cached_kb = val,
                    "SwapTotal:" => swap_total_kb = val,
                    "SwapFree:" => swap_free_kb = val,
                    _ => {}
                }
            }
        }
    }

    let total_bytes = total_kb * 1024;
    let free_bytes = free_kb * 1024;
    let available_bytes = avail_kb * 1024;
    let buffers_bytes = buffers_kb * 1024;
    let cached_bytes = cached_kb * 1024;
    let used_bytes = total_bytes.saturating_sub(available_bytes);
    let used_percent = if total_bytes > 0 {
        ((used_bytes as f64 / total_bytes as f64) * 100.0 * 10.0).round() / 10.0
    } else {
        0.0
    };

    let swap_total_bytes = swap_total_kb * 1024;
    let swap_free_bytes = swap_free_kb * 1024;
    let swap_used_bytes = swap_total_bytes.saturating_sub(swap_free_bytes);
    let swap_used_percent = if swap_total_bytes > 0 {
        ((swap_used_bytes as f64 / swap_total_bytes as f64) * 100.0 * 10.0).round() / 10.0
    } else {
        0.0
    };

    // Count online memory blocks in /sys/devices/system/memory
    let mut memory_blocks_count = 0usize;
    if let Ok(entries) = fs::read_dir("/sys/devices/system/memory") {
        for entry in entries.filter_map(Result::ok) {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if name_str.starts_with("memory") && name_str[6..].chars().all(|c| c.is_ascii_digit()) {
                memory_blocks_count += 1;
            }
        }
    }

    let memory_block_size_bytes = read_sys_string("/sys/devices/system/memory/block_size_bytes")
        .and_then(|s| u64::from_str_radix(s.trim_start_matches("0x"), 16).ok())
        .unwrap_or(128 * 1024 * 1024);

    let parsed_slots = parse_dmidecode_ram_slots();
    let (ram_slots, slot_summary) = if !parsed_slots.is_empty() {
        let occupied = parsed_slots.iter().filter(|s| s.status != "Empty").count();
        let summary = format!(
            "{occupied} of {} physical slots populated",
            parsed_slots.len()
        );
        (parsed_slots, summary)
    } else {
        // Fallback when dmidecode is restricted
        let block_gb = (memory_blocks_count as u64 * memory_block_size_bytes) as f64
            / (1024.0 * 1024.0 * 1024.0);
        let summary = format!(
            "{memory_blocks_count} system memory blocks active (~{:.1} GB across system array)",
            block_gb
        );
        (Vec::new(), summary)
    };

    MemoryInfo {
        total_bytes,
        free_bytes,
        available_bytes,
        used_bytes,
        used_percent,
        buffers_bytes,
        cached_bytes,
        swap_total_bytes,
        swap_free_bytes,
        swap_used_bytes,
        swap_used_percent,
        memory_blocks_count,
        memory_block_size_bytes,
        ram_slots,
        slot_summary,
    }
}

#[derive(Deserialize)]
struct LsblkBlockDevice {
    name: String,
    size: u64,
    #[serde(rename = "type")]
    device_type: String,
    mountpoints: Vec<Option<String>>,
    fstype: Option<String>,
    model: Option<String>,
    rota: Option<bool>,
    state: Option<String>,
    children: Option<Vec<LsblkBlockDevice>>,
}

#[derive(Deserialize)]
struct LsblkRoot {
    blockdevices: Vec<LsblkBlockDevice>,
}

fn get_mount_stats(mountpoint: &str) -> Option<(u64, u64, f64)> {
    use std::ffi::CString;
    use std::mem::MaybeUninit;

    let c_path = CString::new(mountpoint).ok()?;
    let mut stat: MaybeUninit<libc::statvfs> = MaybeUninit::uninit();
    let res = unsafe { libc::statvfs(c_path.as_ptr(), stat.as_mut_ptr()) };
    if res != 0 {
        return None;
    }
    let stat = unsafe { stat.assume_init() };
    let bsize = stat.f_frsize;
    let total = stat.f_blocks * bsize;
    let free = stat.f_bavail * bsize;
    let used = total.saturating_sub(free);
    let pct = if total > 0 {
        ((used as f64 / total as f64) * 100.0 * 10.0).round() / 10.0
    } else {
        0.0
    };
    Some((used, free, pct))
}

fn get_disks_info() -> Vec<DiskDevice> {
    let output = Command::new("lsblk")
        .args([
            "-J",
            "-b",
            "-o",
            "NAME,SIZE,TYPE,MOUNTPOINTS,FSTYPE,MODEL,ROTA,STATE",
        ])
        .output();

    let Ok(output) = output else {
        return Vec::new();
    };

    let Ok(root) = serde_json::from_slice::<LsblkRoot>(&output.stdout) else {
        return Vec::new();
    };

    let mut disks = Vec::new();

    for dev in root.blockdevices {
        if dev.device_type == "loop" {
            continue; // Skip snap/squashfs loops for cleaner overview
        }

        let is_rotational = dev.rota.unwrap_or(false);
        let disk_type = if dev.name.starts_with("nvme") {
            "NVMe SSD".to_string()
        } else if dev.name.starts_with("zram") {
            "zram Compressed Swap".to_string()
        } else if !is_rotational {
            "SATA SSD".to_string()
        } else {
            "Hard Disk Drive (HDD)".to_string()
        };

        let mut partitions = Vec::new();
        if let Some(children) = dev.children {
            for child in children {
                let mp = child.mountpoints.into_iter().flatten().next();
                let (used_bytes, avail_bytes, used_percent) = if let Some(ref m) = mp {
                    if !m.starts_with("[SWAP]") {
                        get_mount_stats(m)
                            .map(|(u, a, p)| (Some(u), Some(a), Some(p)))
                            .unwrap_or((None, None, None))
                    } else {
                        (None, None, None)
                    }
                } else {
                    (None, None, None)
                };

                partitions.push(DiskPartition {
                    name: child.name,
                    size_bytes: child.size,
                    size_formatted: format_bytes(child.size),
                    fstype: child.fstype,
                    mountpoint: mp,
                    used_bytes,
                    avail_bytes,
                    used_percent,
                });
            }
        }

        disks.push(DiskDevice {
            name: dev.name,
            model: dev.model,
            size_bytes: dev.size,
            size_formatted: format_bytes(dev.size),
            disk_type,
            rotational: is_rotational,
            state: dev.state,
            partitions,
        });
    }

    disks
}

fn get_gpus_info() -> Vec<GpuInfo> {
    let mut gpus = Vec::new();
    let output = Command::new("lspci").output();
    if let Ok(output) = output {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            let lower = line.to_lowercase();
            if lower.contains("vga compatible controller")
                || lower.contains("3d controller")
                || lower.contains("display controller")
            {
                let (pci_id, desc) = line.split_once(' ').unwrap_or(("", line));
                let name = desc
                    .split_once(':')
                    .map(|(_, right)| right.trim())
                    .unwrap_or(desc)
                    .to_string();

                let vendor = if name.to_lowercase().contains("nvidia") {
                    "NVIDIA".to_string()
                } else if name.to_lowercase().contains("intel") {
                    "Intel".to_string()
                } else if name.to_lowercase().contains("amd")
                    || name.to_lowercase().contains("advanced micro")
                {
                    "AMD".to_string()
                } else {
                    "Unknown".to_string()
                };

                gpus.push(GpuInfo {
                    name,
                    vendor,
                    pci_id: if pci_id.is_empty() {
                        None
                    } else {
                        Some(pci_id.to_string())
                    },
                });
            }
        }
    }
    gpus
}

fn get_network_interfaces() -> Vec<NetworkInterface> {
    let mut list = Vec::new();
    let net_dir = Path::new("/sys/class/net");
    if let Ok(entries) = fs::read_dir(net_dir) {
        for entry in entries.filter_map(Result::ok) {
            let name = entry.file_name().to_string_lossy().to_string();
            if name == "lo" {
                continue;
            }
            let path = entry.path();
            let is_up = read_sys_string(&format!("{}/operstate", path.display()))
                .map(|s| s.to_lowercase() == "up")
                .unwrap_or(false);
            let is_wireless = path.join("wireless").exists() || path.join("phy80211").exists();
            let mac_address = read_sys_string(&format!("{}/address", path.display()))
                .filter(|s| s != "00:00:00:00:00:00");
            let mtu = read_sys_string(&format!("{}/mtu", path.display()))
                .and_then(|s| s.parse::<u32>().ok());

            list.push(NetworkInterface {
                name,
                is_up,
                is_wireless,
                mac_address,
                mtu,
            });
        }
    }
    list.sort_by(|a, b| b.is_up.cmp(&a.is_up).then_with(|| a.name.cmp(&b.name)));
    list
}

#[tauri::command]
pub async fn get_system_stats() -> AppResult<SystemStats> {
    crate::commands::blocking(|| {
        Ok(SystemStats {
            os: get_os_info(),
            hardware: get_hardware_info(),
            cpu: get_cpu_info(),
            memory: get_memory_info(),
            disks: get_disks_info(),
            gpus: get_gpus_info(),
            network: get_network_interfaces(),
        })
    })
    .await
}
