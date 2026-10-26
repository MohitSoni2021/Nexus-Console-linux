/** Formats the user's operating system name cleanly and adaptively across platforms. */
export function getSystemLabel(platform?: string): string {
  if (platform === 'macos') return 'Mac';
  if (platform === 'linux') return 'Linux system';
  if (platform === 'windows') return 'Windows PC';
  return 'system';
}

export function getOsDisplayName(platform?: string): string {
  if (platform === 'macos') return 'macOS';
  if (platform === 'linux') return 'Linux';
  if (platform === 'windows') return 'Windows';
  return 'System';
}
