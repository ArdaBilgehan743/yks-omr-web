# yks-omr-web

YKS optik cevap kâğıdı okuma + skorlama için Next.js 16 frontend. Backend FastAPI
servisine (`omr_ml_pipeline/api`) konuşur.

## Çalıştırma (local dev)

### 1) Backend (FastAPI, port 8765)

```bash
cd /Users/ardabilgehan/Desktop/omr_ml_pipeline/api
/Users/ardabilgehan/miniforge3/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8765
```

Sağlık kontrolü:

```bash
curl http://127.0.0.1:8765/api/health
```

### 2) Frontend (Next.js, port 3000)

```bash
cd /Users/ardabilgehan/Desktop/yks-omr-web
npm install   # ilk seferde
npm run dev
```

Tarayıcıda: <http://localhost:3001> (bu makinede 3000 portu başka bir Next dev
server tarafından tutulduğu için Next 3001'e düşer; backend CORS
`http://(localhost|127.0.0.1):*` pattern'iyle hangi portta olursa olsun izin verir).

## Konfigürasyon

`.env.local` içinde backend URL'i:

```
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8765
```

## Akış

1. **Upload (`/`)**: Tarayıcı çıktısı veya telefon fotoğrafı sürükle-bırak.
   `POST /api/scan` çağrısı yapılır, `scan_id` döner, `/results/<scan_id>`'e gidilir.
2. **Results (`/results/[scanId]`)**: Çözülmüş cevaplar bölüm bölüm tabloya gelir,
   yanlışları balon butonlarıyla elle düzelt. Sağda debug overlay + cevap anahtarı
   seçici. Anahtar seçip "Skorla" deyince `POST /api/score` ÖSYM kurallarıyla
   (net = D − Y/4) ham puan döner.

## Backend endpoint'leri

| Endpoint | Açıklama |
|---|---|
| `POST /api/scan` (form-data `photo`) | Görüntü yükle → decoded answers + debug PNG URL |
| `GET /api/debug/{scan_id}.png` | Debug overlay görüntüsü |
| `GET /api/answer-keys` | Liste |
| `GET /api/answer-keys/{id}` | Tek anahtar |
| `POST /api/score` `{answer_key_id, user_answers}` | Per-section + total skor |

## Manuel e2e test

```bash
# Backend + frontend ayağa kalkmış durumdayken:
# 1. Tarayıcıda http://localhost:3001 aç
# 2. api/tests/photos/digital_scan/photo.jpg'i sürükle
# 3. Beklenen: 4 bölüm tabloda görünür (Türkçe 8, Sosyal 12, Matematik 7, Fen 4)
# 4. Cevap anahtarı seçici: "Digital Scan Ground Truth (TYT)"
# 5. "Skorla" → net 31.00 (D31 Y0 B22, kalan boş bırakıldı)
```

## Sıradakiler

- Cevap anahtarı yükleyici (UI üzerinden CSV/JSON upload)
- Gerçek ÖSYM anahtarlarıyla seed (Firecrawl, Phase 4)
- PWA + offline cache (next-pwa)
- Kamera capture (phone-photo path, ORB matching geldikten sonra)
