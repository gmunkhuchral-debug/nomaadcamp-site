# NOMAAD Camp · n8n Workflows

n8n Cloud (`chimunllc.app.n8n.cloud`) дээр ажиллаж буй 3 workflow ба тэдгээрийн ажиллахад шаардлагатай файлууд.

## Workflow файлууд

| Файл | Trigger | Үүрэг |
|---|---|---|
| `NOMAAD Quote · 1. Capture .json` | Webhook `/nomaad-quote` (POST) | nomaadcamp.com form → Quote Log Sheet + Items + Internal email + PDF |
| `NOMAAD Quote · 2. Send.json` | Sheets Trigger (row update) | Төлөв = ИЛГЭЭХ → Customer Gmail draft + PDF + Certificate |
| `NOMAAD Quote · 3. Contract Confirmed.json` | Sheets Trigger (row update) | Төлөв = ГЭРЭЭ → Drive дотор гэрээ автомат үүсгэх |

## Хавсралт файлууд

| Файл | Хэрэглээ |
|---|---|
| `NOMAAD-Contract-Template-v2.docx` | Албан ёсны гэрээний шаблон (Google Doc болж хувирах) |
| `Чимун_ХХК_Гэрчилгээ.pdf` | Customer email-д хавсралт (одоо Drive-аас татна) |
| `stamp.png` | Workflow 1-д base64-р embed (эх файл, ирээдүйд солих хэрэгтэй бол) |
| `email-preview.html` | Customer email-ийн design тест preview |

## Архитектур

```
[nomaadcamp.com quote form]
         ↓ POST /nomaad-quote
    Workflow 1 ─→ Quote Log Sheet ("ШИНЭ")
                + Quote Items таб
                + Internal email (hello@nomaadcamp.com)
                + PDF render
         ↓
    Sheets-д "ШИНЭ" статустайгаар орно
         ↓ ажилтан Төлөв = "ИЛГЭЭХ" сонгох
    Workflow 2 (Sheets Trigger автомат барина, ~60 сек хүлээнэ)
                + Customer Gmail Draft (hello@nomaadcamp.com Drafts-д)
                + PDF + Certificate хавсралт
                + Status → "ИЛГЭЭСЭН"
         ↓ нярав Drafts-аас гар орлуулж илгээх
    Зочин гэрээ зөвшөөрсний дараа
         ↓ нярав Төлөв = "ГЭРЭЭ" сонгох
    Workflow 3 (Sheets Trigger автомат барина, ~60 сек хүлээнэ)
                + Drive дотор шаблон хувилна
                + Docs-д 30 placeholder сольно
                + Staff email (team@nomaadcamp.com)
                + Status → "ГЭРЭЭ БАТЛАГДСАН"
```

## Чухал тэмдэглэл

- **Sheets Trigger полинг хийдэг** — Sheet-д статус сольсноос хойш 30-60 секунд хүлээх ёстой.
- **Төлөв** баганад дараахаас алийг ч ашиглана: `ШИНЭ`, `ИЛГЭЭХ`, `ИЛГЭЭСЭН`, `ГЭРЭЭ`, `ГЭРЭЭ БАТЛАГДСАН`. IF node яг тэр текстийг шалгадаг тул үсэг буруу бичих эсвэл хоосон зай оруулахгүй байх хэрэгтэй.

## Google Drive хавтсууд

- **NOMAAD · Гэрээ Templates** — шаблон хадгалах
- [NOMAAD · Гэрээ Үүсгэсэн](https://drive.google.com/drive/folders/1Av7YxSOr-ei182NQpcHp5FlsJOSiQIGb) — generated contracts
- Чимун ХХК гэрчилгээ PDF: `143R-5HRTQLqwE8lvMzcbReiAvEMONUEi`

## ID-ууд

| Нэр | ID |
|---|---|
| Quote Log Sheet | `16pHiShilnG-QdZtc2ciB5JeP_aslZRcqpQqEJvD-0wA` |
| Шаблон Google Doc | `12Ks-tTEovApXlSgfFHvi7zrtpJcNiby6WQtpeOeEFX0` |
| NOMAAD · Гэрээ Үүсгэсэн folder | `1Av7YxSOr-ei182NQpcHp5FlsJOSiQIGb` |
| Cert PDF (Drive) | `143R-5HRTQLqwE8lvMzcbReiAvEMONUEi` |

## Credentials (n8n Cloud дотор үүсгэх)

| Credential | Хаана хэрэглэдэг |
|---|---|
| Google Sheets OAuth2 API | WF1, WF2, WF3 sheet nodes |
| Google Sheets Trigger OAuth2 API | WF2, WF3 Sheets Trigger nodes |
| Google Drive OAuth2 API | WF3 `Drive · Copy template`, WF2 `Drive · Download Certificate` |
| Google Docs OAuth2 API | WF3 `Docs · Replace placeholders` |
| Gmail OAuth2 API | WF1, WF2, WF3 gmail nodes (hello@nomaadcamp.com-р нэвтрүүлсэн) |
