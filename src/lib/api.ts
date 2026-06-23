/**
 * Typed client for the YKS OMR backend (FastAPI on :8765 by default).
 * Configure the base URL via NEXT_PUBLIC_API_BASE.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8765";

export type Answers = Record<string, string | null>;
export type DecodedSections = Record<string, { answers: Answers; flags: unknown[] } | string | null>;

export type ScanResponse = {
  scan_id: string;
  form_id: string;
  page_detected: boolean;
  decoded: DecodedSections;
  debug_image_url: string;
};

export type AnswerKeyListItem = {
  id: string;
  name: string;
  sheet_type: string | null;
};

export type AnswerKey = {
  id: string;
  name: string;
  sheet_type: string;
  source_url?: string;
  fetched_at?: string;
  answers: Record<string, Record<string, string>>;
};

export type SectionScore = { dogru: number; yanlis: number; bos: number; net: number };

export type ScoreResponse = {
  answer_key_id: string;
  answer_key_name: string;
  by_section: Record<string, SectionScore>;
  total: SectionScore;
};

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, `${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function scanPhoto(file: File): Promise<ScanResponse> {
  const form = new FormData();
  form.append("photo", file);
  const res = await fetch(`${API_BASE}/api/scan`, { method: "POST", body: form });
  return handle<ScanResponse>(res);
}

export async function listAnswerKeys(): Promise<AnswerKeyListItem[]> {
  const res = await fetch(`${API_BASE}/api/answer-keys`);
  const data = await handle<{ keys: AnswerKeyListItem[] }>(res);
  return data.keys;
}

export async function getAnswerKey(id: string): Promise<AnswerKey> {
  const res = await fetch(`${API_BASE}/api/answer-keys/${encodeURIComponent(id)}`);
  return handle<AnswerKey>(res);
}

export async function scoreAnswers(
  answerKeyId: string,
  userAnswers: Record<string, Record<string, string | null>>,
): Promise<ScoreResponse> {
  const res = await fetch(`${API_BASE}/api/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer_key_id: answerKeyId, user_answers: userAnswers }),
  });
  return handle<ScoreResponse>(res);
}

export type AnswerKeyCreate = {
  id: string;
  name: string;
  sheet_type: string;
  answers: Record<string, Record<string, string>>;
};

export async function createAnswerKey(req: AnswerKeyCreate): Promise<AnswerKey> {
  const res = await fetch(`${API_BASE}/api/answer-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handle<AnswerKey>(res);
}

export async function deleteAnswerKey(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/answer-keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
    throw new ApiError(res.status, `${res.status}: ${detail}`);
  }
}

export function debugImageUrl(scanId: string): string {
  return `${API_BASE}/api/debug/${scanId}.png`;
}

export type BatchScanItem = {
  filename: string;
  scan_id?: string;
  page_detected?: boolean;
  decoded?: DecodedSections;
  debug_image_url?: string;
  error?: string;
};

export async function batchScanZip(zipFile: File): Promise<{ items: BatchScanItem[] }> {
  const form = new FormData();
  form.append("zipfile", zipFile);
  const res = await fetch(`${API_BASE}/api/batch-scan`, { method: "POST", body: form });
  return handle<{ items: BatchScanItem[] }>(res);
}
