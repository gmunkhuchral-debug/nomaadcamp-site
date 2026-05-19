# NOMAAD Camp · End-to-end уялдааны аудит

Шалгасан 3 эх сурвалж: **GitHub repo (Chimunllc/nomaadcamp-site)** · **Google Drive хавтас (`1VoC1...J-kCs`)** · **n8n cloud дээрх 3 workflow JSON**

---

## 1. End-to-end урсгалын зураг

```
┌──────────────────────────────────────────────────────────────┐
│  nomaadcamp.com (GitHub Pages, CNAME)                        │
│  • main.js → quoteForm submit                                │
│  • POST https://chimunllc.app.n8n.cloud/webhook/nomaad-quote │
│  • mode: 'no-cors', body: application/x-www-form-urlencoded  │
└──────────────────────────┬───────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  WORKFLOW 1 — Capture                                        │
│  Webhook /nomaad-quote (POST)                                │
│    → Sheets · Read counter      [Quote Log, doc 16pHi...]    │
│    → Code · Render HTML         [quote_number, totals, html] │
│    → HTTP · Browserless PDF     [chrome.browserless.io]      │
│    → Code · Decompose items  →  Sheets · Append items        │
│    → Gmail · Internal           [hello@nomaadcamp.com]       │
│    → Sheets · Append log        [Төлөв=ШИНЭ]                 │
└──────────────────────────┬───────────────────────────────────┘
                           ↓ ажилтан ИЛГЭЭХ товч / link
┌──────────────────────────────────────────────────────────────┐
│  WORKFLOW 2 — Send                                           │
│  Webhook /nomaad-quote-send (default GET, ?id=NC-...)        │
│    → Sheets · Find row       (id-ээр Quote Log хайна)        │
│      ├─→ Google Contacts · Create                            │
│      └─→ Sheets · Read items                                 │
│              → Code · Render HTML                            │
│              → HTTP · Browserless PDF                        │
│              → Code · Rename PDF (+ certificate base64)      │
│                  ├─→ Gmail · Draft Customer (draft + 2 PDF)  │
│                  └─→ Sheets · Update status (ИЛГЭЭСЭН)       │
└──────────────────────────┬───────────────────────────────────┘
                           ↓ Sheets Төлөв = ГЭРЭЭ
┌──────────────────────────────────────────────────────────────┐
│  WORKFLOW 3 — Contract Confirmed                             │
│  Webhook /nomaad-contract-trigger (POST)                     │
│    → IF · Төлөв = ГЭРЭЭ                                      │
│      → Sheets · Find quote row                               │
│      → Code · Build contract data (30 placeholder)           │
│        ├─→ Drive · Copy template (12Ks-...EFX0)              │
│        │   → Docs · Replace placeholders                     │
│        │     → Gmail · Notify staff                          │
│        │       → Sheets · Update quote status (ГЭРЭЭ БАТЛ.)  │
│        └─→ Sheets · Append to Finance (doc 1SH1u...)         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. ID болон тохиргооны уялдаа

| Зүйл | Утга | Хаана ашигладаг | Тэмдэглэл |
|---|---|---|---|
| Webhook URL (form) | `chimunllc.app.n8n.cloud/webhook/nomaad-quote` | main.js:1739 | WF1 path-тай таарч байна ✅ |
| CSP `connect-src` | `https://chimunllc.app.n8n.cloud` | index.html:6 | Allowed — fetch гарна ✅ |
| Quote Log Sheet | `16pHiShilnG-QdZtc2ciB5JeP_aslZRcqpQqEJvD-0wA` | WF1, WF2, WF3 | Бүх 3 workflow адил ID хэрэглэж байна ✅ |
| Finance Sheet | `1SH1u4nlGH61U-5FWWTm2c5BwooboMRFhdTSp4uNunhs` | WF3 | Зөвхөн WF3-д хэрэглэгдэж байна |
| Contract Template Doc | `12Ks-tTEovApXlSgfFHvi7zrtpJcNiby6WQtpeOeEFX0` | WF3 Drive Copy | README дахь Doc ID-тэй таарна ✅ |
| Гэрээ Үүсгэсэн folder | `1Av7YxSOr-ei182NQpcHp5FlsJOSiQIGb` | WF3 Drive Copy parents | README-тэй таарна ✅ |
| Drive хавтас аудит | `1VoC1oiLleoYxFrHClz5Hc6KpCP0J-kCs` | (нэвтэрч чадахгүй) | Танай гар дээр шалгана уу |
| Browserless token | `2UTvlG4DqiRU5100c3b9e87c6ab72e2c8b0b2800` | WF1 + WF2 | URL-д нь шууд тавьсан байна — leak ⚠ |

---

## 3. ❗ Олдсон асуудлууд (priority эрэмбээр)

### 🔴 P0 — Workflow 3-д амиа алдсан 3 алдаа (засахгүй бол ажиллахгүй)

**1) Gmail · Notify staff — undefined хувьсагч**

`subject` болон `message` нь:
```
$('Code · Build contract data').item.json.staff_email_subject
$('Code · Build contract data').item.json.staff_email_html
```
гэж байна. Гэтэл Code node нь `contract_email_html` гэдгийг л буцаадаг, `staff_email_subject`/`staff_email_html` гэдгийг **үүсгэдэггүй**.
→ **Имэйл хоосон гарна.**

**2) Sheets · Append to Finance — column map ХООСОН**

```json
"columns": { "value": {}, "matchingColumns": [], "schema": [] }
```
Code node `finance_row` объект бэлдсэн боловч энэ append node нь юу ч map хийгээгүй.
→ **Санхүүгийн Sheets-д юу ч бичигдэхгүй.**

**3) Code · Build contract data — огнооны parser алдаа**

```js
function parseDt(s) {
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})...
```
Google Sheets-ээс уншихад "Эхлэх огноо" нь serial number болж хувирсан байна (`46185.375`). regex таарахгүй.
→ Хэрэв `Анхны өгөгдөл` JSON-аас fallback хийж чадахгүй бол **start_year/month/day/time бүгд хоосон placeholder болно.**

### 🟡 P1 — Workflow 3 бусад асуудлууд

**4) "Sheets Trigger" гэж README-д бичсэн, гэтэл Webhook ашиглаж байна**

CONTRACT-SETUP-ЗААВАР.md-ийн Алхам 4 "Төлөв-ыг ГЭРЭЭ болгож сольсон даруйд автоматаар явна" гэсэн нь:
- `pinData`-д `"Sheets Trigger · On row update"` гэдэг nodes-уудад **байхгүй** node referenced
- Бодит trigger нь `/nomaad-contract-trigger` Webhook

→ Google Sheets-д **Apps Script** нэмж `onEdit(e)` дотор `UrlFetchApp` ашиглан энэ webhook руу POST хийх хэрэгтэй. Apps Script одоо байгаа эсэх **тодорхойгүй** — Sheets дотор шалгах хэрэгтэй.

**5) Node-уудын байрлал тарсан**

WF3-д Webhook + Drive Copy + Docs Replace бүгд y≈300, харин IF + Code + Sheets бүгд y≈3200. Эдгээр нь nodes хооронд маш урт холбоос харагдуулна (functional биш, харагдах байдлын асуудал).

### 🟡 P1 — Workflow 2 асуудал

**6) Webhook httpMethod заагаагүй → default GET**

```json
{ "path": "nomaad-quote-send", "responseMode": "lastNode" }
```
Хэрэв Apps Script `UrlFetchApp.fetch(url, {method:'post'})` хэрэглэдэг бол **404 буцна**. GET ?id=NC-... хэлбэрийн URL л ажиллана.

→ Хэрэв Sheets-н "ИЛГЭЭХ" товч HYPERLINK ашигладаг GET бол OK. Apps Script бол POST болгож засах хэрэгтэй.

### 🟢 P2 — Secret / cleanup

**7) Browserless API token URL-д шууд хадгалагдсан**

Workflow 1, 2 хоёулаа JSON дотор `?token=2UTvl...` гэж шууд хадгалсан. GitHub repo-н `n8n/` folder-т **public repo-д хуулагдсан** байж магадгүй. Энэ нь leak.

→ Token-ийг n8n credentials болгож, URL-аас хасах. Repo-н n8n/ folder-ыг `.gitignore`-т нэмэх эсвэл token-ыг placeholder-ээр солих.

**8) Certificate base64 (~5MB) JSON дотор embed хийгдсэн**

WF2 Code · Rename PDF дотор `Чимун_ХХК_Гэрчилгээ.pdf` base64-р шууд бичигдсэн. Ажиллана, гэхдээ:
- JSON 5.7MB болсон
- Certificate шинэчлэхэд код өөрчлөх ёстой
- Backup/import удаашрана

→ Илүү дээр шийдэл: Drive дотор хадгалаад HTTP node-оор татах эсвэл n8n binary data store ашиглах.

### 🟢 P2 — Workflow 1

**9) Quote Log "Эхлэх огноо" багана нь огнооны string бичигддэг боловч Sheets үүнийг serial number руу хувиргадаг**

WF1 Append log:
```
Эхлэх огноо → ={{ ...start_datetime }}  // "2026-06-12T09:00"
```
Бичигдэх үед Sheets format-аа `Date` гэж тааруулсан бол serial number болж хадгална → WF3-д уншихад огноо хоосон болно (бага №3-тай холбоотой).

→ Sheets-н багана format-ыг `Plain text` болгох, эсвэл WF3-н parser-ыг засах.

---

## 4. Уялдаа зөв (✅) хэсгүүд

- main.js payload (45+ key) бүгд WF1 Code · Render HTML дотор зөв шингэсэн
- CSP `connect-src` дотор n8n cloud домэйн allowed байгаа
- Webhook path 3 талд бүгд таарсан (`/nomaad-quote`, `/nomaad-quote-send`, `/nomaad-contract-trigger`)
- Google Sheets `documentId` 3 workflow дамжин адил утга
- Drive `Copy template` parents folder ID нь README-тэй таарна
- Gmail `Draft Customer` — `data` (PDF) + `certificate` 2 binary хавсралттай draft үүсгэдэг
- WF1 `Code · Decompose items` нь add-on бүрд unit, price, total зөв тооцоо хийдэг
- WF1 `Sheets · Append log` дотор `Анхны өгөгдөл`-д бүх payload JSON хадгалагддаг (WF3 fallback ашигладаг)

---

## 5. Дараагийн алхам — санал

1. **Эхний ээлжид WF3-н 3 P0 алдааг засах** (тусдаа засвартай JSON бэлдэж өгөх боломжтой)
2. **Google Sheets дотор Apps Script байгаа эсэхийг шалгах** — байхгүй бол нэмэх (onEdit → webhook POST)
3. **Browserless token-ыг credentials-руу шилжүүлэх**
4. **Drive хавтасны бүтцийг танай тал шалгах:** `1VoC1...J-kCs` дотор `NOMAAD · Гэрээ Templates`, `NOMAAD · Гэрээ Үүсгэсэн` хоёр хавтас байгаа эсэх
5. (сонголтоор) Certificate base64-ыг Drive файлаас татдаг болгож сольж WF2 JSON-ыг 5.7MB-аас ~30KB болгох

---

*Файл үүсгэсэн: 2026-05-19 · Cowork audit*
