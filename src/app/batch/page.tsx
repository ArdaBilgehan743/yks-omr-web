"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type AnswerKeyListItem,
  type BatchScanItem,
  type ScoreResponse,
  batchScanZip,
  debugImageUrl,
  listAnswerKeys,
  scoreAnswers,
} from "@/lib/api";

type RowScore = ScoreResponse | { error: string };

function extractAnswers(decoded: BatchScanItem["decoded"]): Record<string, Record<string, string | null>> {
  const out: Record<string, Record<string, string | null>> = {};
  if (!decoded) return out;
  for (const [sec, val] of Object.entries(decoded)) {
    if (val && typeof val === "object" && "answers" in val) {
      out[sec] = (val as { answers: Record<string, string | null> }).answers;
    }
  }
  return out;
}

function displayName(item: BatchScanItem): string {
  const adi = item.decoded?.["ADI_SOYADI"];
  if (typeof adi === "string" && adi.trim()) return adi.trim();
  return item.filename;
}

export default function BatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<BatchScanItem[]>([]);
  const [scoring, setScoring] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [keys, setKeys] = useState<AnswerKeyListItem[]>([]);
  const [keyId, setKeyId] = useState("");
  const [scores, setScores] = useState<Record<string, RowScore>>({});

  useEffect(() => { listAnswerKeys().then(setKeys).catch(e => setError(String(e))); }, []);

  const submit = async () => {
    if (!file) return;
    setError(null);
    setScanning(true);
    setItems([]); setScores({});
    try {
      const res = await batchScanZip(file);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  };

  const scoreAll = async () => {
    if (!keyId || items.length === 0) return;
    setScoring(true);
    setError(null);
    const next: Record<string, RowScore> = {};
    for (const item of items) {
      if (item.error || !item.scan_id) {
        next[item.filename] = { error: item.error || "no scan_id" };
        continue;
      }
      try {
        const s = await scoreAnswers(keyId, extractAnswers(item.decoded));
        next[item.filename] = s;
      } catch (e) {
        next[item.filename] = { error: e instanceof Error ? e.message : String(e) };
      }
    }
    setScores(next);
    setScoring(false);
  };

  const csv = useMemo(() => {
    if (items.length === 0) return "";
    const sections = new Set<string>();
    for (const item of items) {
      for (const sec of Object.keys(extractAnswers(item.decoded))) sections.add(sec);
    }
    const secList = Array.from(sections);
    const cols = ["dosya", "ad_soyad", "kitapcik", "page_det",
      ...secList.flatMap(s => [`${s}_D`, `${s}_Y`, `${s}_B`, `${s}_net`]),
      "toplam_net"];
    const lines = [cols.join(",")];
    for (const item of items) {
      const s = scores[item.filename];
      const adi = (item.decoded?.["ADI_SOYADI"] as string | null) || "";
      const kit = (item.decoded?.["KITAPCIK_TURU"] as string | null) || "";
      const row: (string | number)[] = [item.filename, `"${adi}"`, kit, item.page_detected ? "1" : "0"];
      for (const sec of secList) {
        if (s && !("error" in s)) {
          const sc = s.by_section[sec];
          row.push(sc?.dogru ?? "", sc?.yanlis ?? "", sc?.bos ?? "", sc?.net?.toFixed(2) ?? "");
        } else {
          row.push("", "", "", "");
        }
      }
      row.push((s && !("error" in s)) ? s.total.net.toFixed(2) : "");
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }, [items, scores]);

  const downloadCsv = () => {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `omr-batch-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Toplu Tarama (ZIP)</h1>
          <p className="text-sm text-slate-600 mt-1">
            Sınıfın tüm optiklerini ZIP olarak at, hepsi taransın ve anahtarla skorlanıp tabloda göster.
          </p>
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Ana sayfa</Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-6 text-center">
        <input
          id="zipPicker" type="file" accept=".zip"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block mx-auto text-sm"
        />
        {file && <p className="mt-2 text-sm text-slate-600">{file.name} ({Math.round(file.size / 1024)} KB)</p>}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={submit} disabled={!file || scanning}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300"
        >
          {scanning ? `Taranıyor... (${items.length}/?)` : "Hepsini tara"}
        </button>
        {items.length > 0 && (
          <>
            <select
              value={keyId}
              onChange={e => { setKeyId(e.target.value); setScores({}); }}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">cevap anahtarı seç</option>
              {keys.map(k => <option key={k.id} value={k.id}>{k.name} ({k.sheet_type})</option>)}
            </select>
            <button
              onClick={scoreAll} disabled={!keyId || scoring}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-300"
            >
              {scoring ? "Skorlanıyor..." : "Hepsini skorla"}
            </button>
            {Object.keys(scores).length > 0 && (
              <button
                onClick={downloadCsv}
                className="px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50"
              >
                CSV indir
              </button>
            )}
            <span className="text-sm text-slate-500 ml-auto">{items.length} öğrenci</span>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2">Dosya</th>
                <th className="text-left px-3 py-2">Ad Soyad</th>
                <th className="text-center px-3 py-2">Kit</th>
                <th className="text-center px-3 py-2">Page</th>
                <th className="text-right px-3 py-2">İşaretli</th>
                <th className="text-right px-3 py-2">Flag</th>
                <th className="text-right px-3 py-2">Net (toplam)</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => {
                const decoded = extractAnswers(item.decoded);
                const marked = Object.values(decoded).reduce(
                  (a, sec) => a + Object.values(sec).filter(v => v).length, 0);
                const flags = item.decoded
                  ? Object.values(item.decoded).reduce((a, v) =>
                      a + (v && typeof v === "object" && "flags" in v ? (v.flags as unknown[]).length : 0), 0)
                  : 0;
                const s = scores[item.filename];
                return (
                  <tr key={item.filename} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{item.filename}</td>
                    <td className="px-3 py-2 font-medium">{displayName(item)}</td>
                    <td className="px-3 py-2 text-center">{(item.decoded?.["KITAPCIK_TURU"] as string) || "—"}</td>
                    <td className="px-3 py-2 text-center text-xs">{item.page_detected ? "✓" : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{marked}</td>
                    <td className={`px-3 py-2 text-right font-mono ${flags > 5 ? "text-red-600" : flags > 0 ? "text-amber-600" : "text-slate-400"}`}>{flags}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {s && !("error" in s) ? s.total.net.toFixed(2) : (item.error ? "ERR" : "—")}
                    </td>
                    <td className="px-3 py-2">
                      {item.scan_id && (
                        <a href={debugImageUrl(item.scan_id)} target="_blank" rel="noopener"
                           className="text-xs text-indigo-600 hover:underline">overlay</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && !scanning && (
        <p className="text-center text-slate-500 text-sm py-12">
          Henüz ZIP atılmadı. Üstteki dosya seçicisinden bir ZIP at.
        </p>
      )}
    </div>
  );
}
