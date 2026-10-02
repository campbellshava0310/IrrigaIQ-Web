/** Best-effort, human-readable device label for the session list. Never used for security decisions. */
export function describeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return 'Unknown device';
  }
  if (/okhttp|CFNetwork|Expo|Dalvik/i.test(userAgent)) {
    return 'IrrigaIQ mobile app';
  }
  const browser =
    (/Edg\//.test(userAgent) && 'Edge') ||
    (/Firefox\//.test(userAgent) && 'Firefox') ||
    (/Chrome\//.test(userAgent) && 'Chrome') ||
    (/Safari\//.test(userAgent) && 'Safari') ||
    (/curl\//.test(userAgent) && 'curl') ||
    'Browser';
  const os =
    (/iPhone|iPad/.test(userAgent) && 'iOS') ||
    (/Android/.test(userAgent) && 'Android') ||
    (/Mac OS X/.test(userAgent) && 'macOS') ||
    (/Windows/.test(userAgent) && 'Windows') ||
    (/Linux/.test(userAgent) && 'Linux') ||
    null;
  return os ? `${browser} on ${os}` : browser;
}
