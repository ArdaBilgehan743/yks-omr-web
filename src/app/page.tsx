"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { scanPhoto } from "@/lib/api";
import { rememberScan } from "@/lib/scanCache";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const accept = useCallback((f: File) => {
    setFile(f);
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }, [preview]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) accept(f);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) accept(f);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const scan = await scanPhoto(file);
      rememberScan(scan);
      router.push(`/results/${scan.scan_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "scan failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Optik Cevap Kâğıdı Yükle</h1>
        <p className="text-sm text-slate-600 mt-1">
          Tarayıcı çıktısı (PNG/JPG) veya telefon fotoğrafı. OPTIK-129 formatı.
        </p>
      </div>

      <label
        htmlFor="photo"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="max-h-80 rounded shadow-sm" />
            <p className="text-sm text-slate-600">{file?.name} ({Math.round((file?.size ?? 0) / 1024)} KB)</p>
            <p className="text-xs text-slate-500">Başka dosya seçmek için tıkla veya sürükle</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-slate-700">Dosyayı buraya sürükle veya seç</p>
            <p className="text-xs text-slate-500">PNG, JPG kabul edilir</p>
          </div>
        )}
        <input id="photo" type="file" accept="image/*" className="hidden" onChange={onPick} />
      </label>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={!file || busy}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {busy ? "Taranıyor..." : "Taramayı başlat"}
        </button>
        {file && !busy && (
          <button
            onClick={() => { setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }}
            className="px-4 py-2 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
          >
            Temizle
          </button>
        )}
      </div>
    </div>
  );
}
