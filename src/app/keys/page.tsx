"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  type AnswerKeyListItem,
  createAnswerKey,
  deleteAnswerKey,
  listAnswerKeys,
} from "@/lib/api";

const DEFAULT_SECTIONS = [
  { name: "Türkçe", rows: 40 },
  { name: "Sosyal Bilimler", rows: 30 },
  { name: "Temel Matematik", rows: 40 },
  { name: "Fen Bilimleri", rows: 20 },
];

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

/** Parse a free-form string of answers like "ABCDE  ABCDE..." or
 *  "1A 2B 3C ..." or "1=A, 2=B" into a {q: letter} dict. */
function parseAnswers(raw: string, maxRow: number): Record<string, string> {
  const out: Record<string, string> = {};
  const tokens = raw.replace(/[,;]/g, " ").split(/\s+/).filter(Boolean);
  // Detect mode: any token with a digit prefix → numbered mode
  const numbered = tokens.some(t => /^\d+[=:]?[A-Ea-e]$/.test(t));
  if (numbered) {
    for (const tok of tokens) {
      const m = tok.match(/^(\d+)[=:]?([A-Ea-e])$/);
      if (m) {
        const q = parseInt(m[1], 10);
        if (q >= 1 && q <= maxRow) out[String(q)] = m[2].toUpperCase();
      }
    }
  } else {
    // Sequential mode: each letter is the next question.
    // Strip non-letters, then assign one per position.
    const letters = raw.toUpperCase().replace(/[^A-EX]/g, "");
    for (let i = 0; i < letters.length && i < maxRow; i++) {
      const ch = letters[i];
      if (OPTION_LETTERS.includes(ch)) out[String(i + 1)] = ch;
      // 'X' = leave blank (skip)
    }
  }
  return out;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<AnswerKeyListItem[]>([]);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [sheetType, setSheetType] = useState<"TYT" | "AYT" | "YDT">("TYT");
  const [rawBySection, setRawBySection] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_SECTIONS.map(s => [s.name, ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => listAnswerKeys().then(setKeys).catch(e => setError(String(e)));
  useEffect(() => { reload(); }, []);

  const onCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      const answers: Record<string, Record<string, string>> = {};
      for (const sec of DEFAULT_SECTIONS) {
        const parsed = parseAnswers(rawBySection[sec.name] || "", sec.rows);
        if (Object.keys(parsed).length > 0) answers[sec.name] = parsed;
      }
      if (!id || !name || Object.keys(answers).length === 0) {
        throw new Error("id, name ve en az bir bölüm zorunlu");
      }
      await createAnswerKey({ id, name, sheet_type: sheetType, answers });
      setId(""); setName("");
      setRawBySection(Object.fromEntries(DEFAULT_SECTIONS.map(s => [s.name, ""])));
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (key: AnswerKeyListItem) => {
    if (!confirm(`Sil: ${key.name}?`)) return;
    setError(null);
    try {
      await deleteAnswerKey(key.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const previewCount = (sec: { name: string; rows: number }) => {
    const parsed = parseAnswers(rawBySection[sec.name] || "", sec.rows);
    return Object.keys(parsed).length;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cevap Anahtarları</h1>
          <p className="text-sm text-slate-600 mt-1">
            Skorlama için kullanılan anahtarlar. Test-fixture anahtarları silinemez.
          </p>
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Ana sayfa</Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="px-4 py-3 border-b border-slate-200 font-medium">
          Kayıtlı anahtarlar ({keys.length})
        </div>
        <div className="divide-y divide-slate-100">
          {keys.map(k => (
            <div key={k.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{k.name}</div>
                <code className="text-xs text-slate-500">{k.id} · {k.sheet_type}</code>
              </div>
              <button
                onClick={() => onDelete(k)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <div className="font-medium">Yeni anahtar ekle</div>

        <div className="grid grid-cols-3 gap-3">
          <input
            value={id} onChange={e => setId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            placeholder="id (örn. tyt-deneme-12)"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
          />
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="görünür ad"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <select
            value={sheetType} onChange={e => setSheetType(e.target.value as "TYT" | "AYT" | "YDT")}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm bg-white"
          >
            <option value="TYT">TYT</option>
            <option value="AYT">AYT</option>
            <option value="YDT">YDT</option>
          </select>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
          <strong>Format:</strong> her bölüm için harfleri yapıştır.
          Sırayla yaz: <code>ABCDE ABCDE...</code> (1. soru A, 2. soru B, ...).
          Soru numarasıyla: <code>1A 2B 3C ...</code>. Boş bırakmak için <code>X</code>.
        </div>

        {DEFAULT_SECTIONS.map(sec => (
          <div key={sec.name}>
            <label className="block text-sm font-medium mb-1">
              {sec.name}{" "}
              <span className="text-xs text-slate-500">
                (1-{sec.rows}) · {previewCount(sec)} cevap algılandı
              </span>
            </label>
            <textarea
              value={rawBySection[sec.name]}
              onChange={e => setRawBySection(prev => ({ ...prev, [sec.name]: e.target.value }))}
              rows={3}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
              placeholder={sec.name === "Türkçe"
                ? "ABCDEABCDE...   (40 harf)   veya   1A 2B 3C ..."
                : `(boş bırak veya ${sec.rows} cevap yapıştır)`}
            />
          </div>
        ))}

        <div className="flex gap-3">
          <button
            onClick={onCreate} disabled={busy}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {busy ? "Kaydediliyor..." : "Anahtarı kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
