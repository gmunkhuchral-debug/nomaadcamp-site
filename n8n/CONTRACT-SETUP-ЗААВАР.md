# Гэрээ Auto-fill Setup заавар

## 1. Drive хавтсуудыг бэлдэх

### 1.1. Template Doc хадгалах хавтас

[Google Drive](https://drive.google.com) → New → Folder → нэр: **`NOMAAD · Гэрээ Templates`**

### 1.2. Үүсгэгдсэн гэрээнүүдийг хадгалах хавтас

New → Folder → нэр: **`NOMAAD · Гэрээ Үүсгэсэн`**

Энэ хавтасны Folder ID-г тэмдэглэж авна (URL дотор `/folders/XXXX` хэсэг).

---

## 2. Google Doc Template үүсгэх

1. `NOMAAD · Гэрээ Templates` хавтас руу очих
2. New → **Google Docs** → нэр: **`NOMAAD Гэрээ Template v1`**
3. `NOMAAD-Contract-Template.md` файлын **бүх агуулгыг** энэ Doc-руу хуулах (Markdown форматыг хадгалахын тулд heading, list-уудыг Doc дотор гар хийнэ — эсвэл https://www.markdowntohtml.com/ ашиглаж HTML-ээр convert хийгээд paste хийнэ)
4. **Placeholder-ууд `{{}}` хаалттай байх ёстой**:
   - `{{quote_number}}`
   - `{{contract_date}}`
   - `{{company_name}}`
   - `{{tax_id}}`
   - `{{contact_name}}`
   - `{{phone}}`
   - `{{email}}`
   - `{{camp_name}}`
   - `{{tier}}`
   - `{{guest_count}}`
   - `{{start_datetime}}`
   - `{{end_datetime}}`
   - `{{list_price}}`
   - `{{discount}}`
   - `{{final_amount}}`
   - `{{vat_included}}`
   - `{{deposit_30}}`
   - `{{balance_70}}`
   - `{{meeting_note}}`
   - `{{tier_inclusions}}`
   - `{{generated_at}}`

5. Template Doc-ийн **File ID**-г тэмдэглэх (URL-аас `/d/XXXXX/edit` хэсэг)

---

## 3. Workflow 3-руу гэрээ үүсгэх node-ууд нэмэх

Workflow 3 (`NOMAAD Quote · 3. Contract Confirmed`)-руу 5 шинэ node нэмнэ:

### 3.1. Google Drive · Copy template (`Code · Build contract data`-ийн дараа)

- **Operation:** Copy file
- **File ID:** `{{TEMPLATE_DOC_ID}}` (дээр тэмдэглэсэн)
- **Name (нэр):** `={{ $('Code · Build contract data').item.json.quote_number }} · {{ $('Code · Build contract data').item.json.company }} · Гэрээ`
- **Parent folder ID:** `{{CONTRACTS_FOLDER_ID}}` (`Гэрээ Үүсгэсэн` хавтсын ID)

### 3.2. Google Docs · Replace Text

- **Operation:** Update document
- **Document ID:** Copy node-аас (`={{ $json.id }}`)
- **Updates:** Replace бүх placeholder тус бүрд (20 ширхэг)
  - Replace text: `{{quote_number}}` → with: `={{ $('Code · Build contract data').item.json.quote_number }}`
  - Replace text: `{{company_name}}` → with: `={{ $('Code · Build contract data').item.json.company }}`
  - ... (бусад placeholder-ууд)

### 3.3. Google Drive · Get share link (нээлттэй харах эрх)

- **Operation:** Share file
- **File ID:** `={{ $('Google Drive · Copy template').item.json.id }}`
- **Permission:** Reader
- **Email/Domain:** anyone (эсвэл зөвхөн `{{ $('Code · Build contract data').item.json.email }}`-д хязгаарлаж болно)

### 3.4. Sheets · Update quote with contract link

- **Operation:** Update row
- **Document ID:** Quote Log Sheet
- **Lookup column:** `Үнийн саналын дугаар`
- **Lookup value:** `={{ $('Code · Build contract data').item.json.quote_number }}`
- **Update columns:**
  - `Гэрээ Doc URL`: `={{ $('Google Drive · Copy template').item.json.webViewLink }}`

⚠ Sheet-д **"Гэрээ Doc URL"** гэдэг шинэ багана нэмэх хэрэгтэй.

### 3.5. Gmail · Notify staff with contract link (одоо байгаа Gmail · Notify staff-ийг шинэчлэх)

Subject: `📄 Гэрээ бэлэн: {{ quote_number }} · {{ company }}`

Body (HTML):
```html
<p>{{ company }}-н гэрээ автоматаар үүсгэгдсэн байна.</p>
<p><strong>Шалгаад зочинд илгээнэ үү:</strong></p>
<p><a href="{{ contract_doc_url }}">📄 Гэрээ нээх</a></p>
<ul>
  <li>Дүн: {{ final_amount }}₮</li>
  <li>Урьдчилгаа: {{ deposit_30 }}₮</li>
  <li>Огноо: {{ start_datetime }} → {{ end_datetime }}</li>
</ul>
<p>Doc-ийг шалгаад зөв бол PDF болгож зочин руу илгээнэ үү.</p>
```

---

## 4. Quote Log Sheet-д "Гэрээ Doc URL" багана нэмэх

[Quote Log Sheet](https://docs.google.com/spreadsheets/d/16pHiShilnG-QdZtc2ciB5JeP_aslZRcqpQqEJvD-0wA/edit) нээх → толгойд шинэ багана:

- Багана нэр: **`Гэрээ Doc URL`**
- Байршил: сүүлд (`Гэрээ зурсан огноо`-н дараа)

---

## 5. Туршилт

1. Quote Log Sheet-аас аль нэг quote-н Төлөв-ыг `ИЛГЭЭСЭН` → `ГЭРЭЭ` болгох
2. 1 минут хүлээх
3. [n8n Executions](https://chimunllc.app.n8n.cloud/insights/total) — амжилттай execution гарах ёстой
4. **`NOMAAD · Гэрээ Үүсгэсэн`** Drive хавтас нээх → шинэ Doc гарсан байна
5. Doc-ыг нээж placeholder-ууд **бүгд бөглөгдсөн** эсэхийг шалгах
6. team@nomaadcamp.com-д email ирэх (Doc линктэй)
7. Quote Log Sheet-ийн `Гэрээ Doc URL` багана автомат бөглөгдсөн

---

## 6. Дараагийн алхам — Ажилтны гар үйлдэл

Гэрээ автоматаар үүссэний дараа ажилтан:

1. Doc нээж шалгах (placeholder-ууд орсон, формат зөв эсэх)
2. Шаардлагатай бол гар засвар оруулах (банк, тусгай нөхцөл)
3. File → Download → **PDF** формат сонгох
4. PDF-ыг зочинд email-ээр илгээх (эсвэл шууд гар утаснаар, Viber)
5. Зочин гарын үсэг тавьж буцаасны дараа — Sheet-ийн `Гэрээ зурсан огноо` багана бөглөх

---

## 7. Дараагийн боломжтой сайжруулалт

- **Auto PDF** — Doc-ыг auto-аар PDF болгож хадгалах
- **Auto email customer** — Гэрээг шууд зочин руу илгээх (зөвхөн staff review-н дараа)
- **E-signature** — DocuSign эсвэл Adobe Sign integration
- **WhatsApp/Viber** notification зочинд

Хэрэв эдгээрийг хиймээр бол хэлээрэй.
