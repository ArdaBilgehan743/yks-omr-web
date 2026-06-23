"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type AnswerKeyListItem,
  type ScanResponse,
  type ScoreResponse,
  debugImageUrl,
  listAnswerKeys,
  scoreAnswers,
} from "@/lib/api";
import { recallScan } from "@/lib/scanCache";

type AnswerMap = Record<string, Record<string, string | null>>;

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

function extractAnswers(scan: ScanResponse): AnswerMap {
  const out: AnswerMap = {};
  for (const [section, value] of Object.entries(scan.decoded)) {
    if (value && typeof value === "object" && "answers" in value) {
      out[section] = { ...(value as { answers: Record<string, string | null> }).answers };
    }
  }
  return out;
}

export default function ResultsPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = use(params);
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [keys, setKeys] = useState<AnswerKeyListItem[]>([]);
  const [keyId, setKeyId] = useState<string>("");
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = recallScan(scanId);
    if (cached) {
      setScan(cached);
      setAnswers(extractAnswers(cached));
    } else {
      setError(
        "Bu sekme bu taramayı hatırlamıyor. Ana sayfadan tekrar yükle.",
      );
    }
    listAnswerKeys().then(setKeys).catch((e) => setError(String(e)));
  }, [scanId]);

  const totals = useMemo(() => {
    let marked = 0;
    let blank = 0;
    for (const section of Object.values(answers)) {
      for (const v of Object.values(section)) {
        if (v) marked++;
        else blank++;
      }
    }
    return { marked, blank };
  }, [answers]);

  const setAnswer = (section: string, q: string, value: string | null) => {
    setAnswers((prev) => ({
      ...prev,
      [section]: { ...prev[section], [q]: value },
    }));
    setScore(null); // invalidate prior score
  };

  const computeScore = async () => {
    if (!keyId) return;
    setScoring(true);
    setError(null);
    try {
      const result = await scoreAnswers(keyId, answers);
      setScore(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScoring(false);
    }
  };

  if (!scan) {
    return (
      <div className="space-y-4">
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Link href="/" className="text-indigo-600 hover:underline text-sm">← Ana sayfa</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tarama Sonuçları</h1>
          <p className="text-sm text-slate-600 mt-1">
            scan_id: <code className="text-xs">{scan.scan_id}</code> ·{" "}
            page_detected: <strong>{scan.page_detected ? "evet" : "hayır"}</strong> ·{" "}
            işaretli: {totals.marked} · boş: {totals.blank}
          </p>
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">+ Yeni tarama</Link>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
        {/* Left: editable answer tables */}
        <div className="space-y-6">
          {Object.entries(answers).map(([section, sectionAnswers]) => (
            <AnswerSection
              key={section}
              name={section}
              answers={sectionAnswers}
              onChange={(q, v) => setAnswer(section, q, v)}
              score={score?.by_section[section]}
            />
          ))}
        </div>

        {/* Right: debug overlay + score panel */}
        <aside className="space-y-6 md:sticky md:top-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500 mb-2">Debug overlay</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={debugImageUrl(scan.scan_id)} alt="debug overlay" className="w-full rounded" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium">Cevap anahtarı ile skor</p>
            <select
              value={keyId}
              onChange={(e) => { setKeyId(e.target.value); setScore(null); }}
              className="block w-full rounded border border-slate-300 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">-- anahtar seç --</option>
              {keys.map((k) => (
                <option key={k.id} value={k.id}>{k.name} ({k.sheet_type})</option>
              ))}
            </select>
            <button
              onClick={computeScore}
              disabled={!keyId || scoring}
              className="w-full px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {scoring ? "Hesaplanıyor..." : "Skorla"}
            </button>

            {score && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="rounded bg-indigo-50 p-3">
                  <p className="text-xs text-slate-500">Toplam</p>
                  <p className="text-2xl font-bold text-indigo-700">net {score.total.net.toFixed(2)}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="text-green-700">D {score.total.dogru}</span>
                    {" · "}
                    <span className="text-red-700">Y {score.total.yanlis}</span>
                    {" · "}
                    <span className="text-slate-500">B {score.total.bos}</span>
                  </p>
                </div>
                <div className="space-y-1.5 text-sm">
                  {Object.entries(score.by_section).map(([s, sc]) => (
                    <div key={s} className="flex justify-between gap-3">
                      <span className="text-slate-700">{s}</span>
                      <span className="font-mono text-xs text-slate-600">
                        D{sc.dogru} Y{sc.yanlis} B{sc.bos} · <strong>net {sc.net.toFixed(2)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function AnswerSection({
  name,
  answers,
  onChange,
  score,
}: {
  name: string;
  answers: Record<string, string | null>;
  onChange: (q: string, v: string | null) => void;
  score?: { dogru: number; yanlis: number; bos: number; net: number };
}) {
  const sortedQs = Object.keys(answers).sort((a, b) => Number(a) - Number(b));
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-medium">{name}</h2>
        {score && (
          <span className="text-xs font-mono text-slate-600">
            D{score.dogru} Y{score.yanlis} B{score.bos} · net {score.net.toFixed(2)}
          </span>
        )}
      </div>
      <div className="p-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 max-h-[400px] overflow-y-auto">
        {sortedQs.map((q) => (
          <BubbleRow key={q} q={q} value={answers[q]} onChange={(v) => onChange(q, v)} />
        ))}
      </div>
    </div>
  );
}

function BubbleRow({
  q,
  value,
  onChange,
}: {
  q: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <>
      <div className="text-xs text-slate-500 px-2 py-1 self-center font-mono w-8 text-right">{q}</div>
      <div className="flex gap-1">
        {OPTION_LETTERS.map((letter) => {
          const active = value === letter;
          return (
            <button
              key={letter}
              onClick={() => onChange(active ? null : letter)}
              className={`w-7 h-7 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
              }`}
            >
              {letter}
            </button>
          );
        })}
        <button
          onClick={() => onChange(null)}
          className={`ml-1 px-2 h-7 rounded text-xs border transition-colors ${
            value === null
              ? "bg-slate-200 text-slate-700 border-slate-300"
              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
          }`}
          title="Boş bırak"
        >
          boş
        </button>
      </div>
    </>
  );
}
