# Засваруудын тайлбар (fixed/)

Эх файл: `/n8n/NOMAAD Quote · 2. Send.json` + `/n8n/NOMAAD Quote · 3. Contract Confirmed.json`
Зассан: `/n8n/fixed/...`

## Workflow 3 — Contract Confirmed (өөрчлөлт)

### P0 — Критикал засвар

1. **Code · Build contract data** — `staff_email_subject` + `staff_email_html` нэмсэн.
   - Gmail · Notify staff одоо хоосон явахгүй.
   - Сэдэв: `[Гэрээ] NC-XXXX · Компани · XX,XXX,XXX₮`
   - HTML email NOMAAD brand өнгөтэй (#F5F1E8 background, #0c2e1f accent).

2. **Code · Build contract data → parseDt()** — Sheets serial number танидаг болсон.
   - `46185.375` → `2026-06-12 09:00` зөв задардаг.
   - ISO string `"2026-06-12T09:00"` хуучин шигээ ажиллана (fallback).
   - JS `Date` parsing нэмэгдсэн (3-р fallback).

3. **Sheets · Append to Finance** — 13 баганад column map нэмсэн.
   - `Үнийн саналын дугаар`, `Компанийн нэр`, `Холбоо барих хүн`, `Кемп`, `Багц`, `Хүний тоо`, `Нийт гэрээний дүн`, `Урьдчилгаа 30%`, `Үлдэгдэл 70%`, `НӨАТ`, `Эхлэх огноо`, `Дуусах огноо`, `Үүсгэсэн огноо`
   - Code node-д `fin_*` талбарууд тус бүрийг бэлдсэн (Sheets append node нь nested object-ыг шууд унших боломжгүй тул).

### P1 — Цэвэрлэгээ

4. **pinData** — `Sheets Trigger · On row update` гэдэг "ghost" reference устгасан.
5. **Node positions** — 9 node-ийг нэг шулуун дээр (`y=300` + branch `y=420`) байрлуулсан.

## Workflow 2 — Send (өөрчлөлт)

6. **Webhook Send** — `httpMethod: "GET"` ил тод заасан.
   - `filtersUI` нь `$json.query.id` ашигладаг тул GET ?id=... зориулсан.
   - Apps Script эсвэл Sheets HYPERLINK товч `?id=NC-...` хэлбэрээр дуудна.

## Workflow 1 — Capture

Алдаа олдоогүй. Энэ workflow-г огт өөрчлөөгүй.

---

## Импортлох заавар

n8n Cloud руу нэвтрэх → Workflows → одоо ажиллаж буй "NOMAAD Quote · 3. Contract Confirmed"-ыг нээх → "..." → **Import from File** → `fixed/NOMAAD Quote · 3. Contract Confirmed.json` → **Replace existing**.

⚠️ **Credentials** дахин холбох шаардлагатай байж магадгүй:
- Google Sheets OAuth2 API
- Google Drive OAuth2 (Drive · Copy template node)
- Google Docs OAuth2 (Docs · Replace placeholders)
- Gmail OAuth2 API

⚠️ **Finance Sheet** (`1SH1u4nlGH61U-5FWWTm2c5BwooboMRFhdTSp4uNunhs`)-ийн "📝 Гэрээ" таб дотор дараах **толгойн нэрсийг нэмэх** хэрэгтэй (column map таарахын тулд):
```
Үнийн саналын дугаар | Компанийн нэр | Холбоо барих хүн | Кемп | Багц |
Хүний тоо | Нийт гэрээний дүн | Урьдчилгаа 30% | Үлдэгдэл 70% | НӨАТ |
Эхлэх огноо | Дуусах огноо | Үүсгэсэн огноо
```

## Засаагүй зүйлс (танай тал шийдэх)

- **Browserless API token URL-д шууд хадгалагдсан** (WF1 + WF2).
  Шийдэх арга: n8n credentials болгож үүсгээд `Header Auth` хэлбэрээр оруулах,
  эсвэл `Environment Variables` (`{{$env.BROWSERLESS_TOKEN}}`) ашиглах.

- **Certificate base64 (~5.5MB) WF2 кодод embed.** Ажиллана, гэхдээ ирээдүйд
  Drive-ийн нэг file ID-аас HTTP-ээр татах нь илүү энгийн.

- **Google Sheets Apps Script.** Workflow 2 + 3-ыг Sheets дотроос дуудах хэрэгтэй:
  - Workflow 2: "ИЛГЭЭХ" статус → `GET https://chimunllc.app.n8n.cloud/webhook/nomaad-quote-send?id=NC-XXXX`
  - Workflow 3: "ГЭРЭЭ" статус → `POST https://chimunllc.app.n8n.cloud/webhook/nomaad-contract-trigger` body нь тухайн мөрний JSON
  Хэрэв Apps Script одоогоор байхгүй бол `apps-script-template.gs` бэлдэж өгөх боломжтой.
