/**
 * Per-tab cache for the most recent scan response so the results page can
 * render without re-uploading. Keyed by scan_id. Backed by sessionStorage
 * so it survives a refresh but not a new tab.
 */
import type { ScanResponse } from "./api";

const PREFIX = "yks-omr-scan-";

export function rememberScan(scan: ScanResponse): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PREFIX + scan.scan_id, JSON.stringify(scan));
}

export function recallScan(scanId: string): ScanResponse | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PREFIX + scanId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScanResponse;
  } catch {
    return null;
  }
}
