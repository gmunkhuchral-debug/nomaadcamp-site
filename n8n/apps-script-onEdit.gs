/**
 * NOMAAD Quote Log — onEdit trigger
 * =================================================================
 * Quote Log Sheet-ийн `Төлөв` баганад "ИЛГЭЭХ" эсвэл "ГЭРЭЭ" гэж
 * бичсэн даруйд тухайн n8n webhook руу автоматаар дуудлага явуулна.
 *
 * SETUP (1 удаа хийнэ):
 * --------------------------------------------------------
 * 1. Quote Log Sheet нээх
 *      https://docs.google.com/spreadsheets/d/16pHiShilnG-QdZtc2ciB5JeP_aslZRcqpQqEJvD-0wA
 * 2. Extensions → Apps Script
 * 3. Default `Code.gs`-ийг устгаад энэ файлын агуулгыг хуулж тавих
 * 4. Дискет icon → Save → нэр "NOMAAD onEdit"
 * 5. Зүүн талын Triggers (⏰) → Add Trigger:
 *      Function: onEdit
 *      Event source: From spreadsheet
 *      Event type: On edit
 *      Failure notify: weekly (эсвэл immediately)
 * 6. Эхлэх үед Authorization асууна → Allow
 *
 * STATUS COLUMN VALUES (Quote Log "Төлөв" багана):
 * --------------------------------------------------------
 *   ШИНЭ              — Workflow 1 шинээр үүсгэх үед автоматаар тавьдаг
 *   ИЛГЭЭХ            — Нярав сонгоно → WF2 (Send) ажиллана
 *   ИЛГЭЭСЭН          — WF2 амжилттай дууссаны дараа автоматаар сольдог
 *   ГЭРЭЭ             — Нярав сонгоно → WF3 (Contract Confirmed) ажиллана
 *   ГЭРЭЭ БАТЛАГДСАН  — WF3 амжилттай дууссаны дараа автоматаар сольдог
 *
 * =================================================================
 */

const N8N_BASE = 'https://chimunllc.app.n8n.cloud/webhook';
const WEBHOOK_SEND     = N8N_BASE + '/nomaad-quote-send';      // GET ?id=NC-XXXX
const WEBHOOK_CONTRACT = N8N_BASE + '/nomaad-contract-trigger'; // POST { ...row }

const SHEET_NAME       = 'Quote Log';
const STATUS_COL_NAME  = 'Төлөв';
const ID_COL_NAME      = 'Үнийн саналын дугаар';

function onEdit(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;

    // Зөвхөн нэг нүд өөрчилсөн тохиолдолд л ажиллана (drag fill бол хайхрахгүй)
    if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;

    const row = e.range.getRow();
    if (row < 2) return; // header

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
                         .getValues()[0];
    const statusCol = headers.indexOf(STATUS_COL_NAME) + 1;
    const idCol     = headers.indexOf(ID_COL_NAME) + 1;
    if (!statusCol || !idCol) return;

    // Зөвхөн "Төлөв" багана өөрчлөгдсөн үед л ажиллана
    if (e.range.getColumn() !== statusCol) return;

    const newStatus = String(e.value || '').trim();
    const quoteId   = String(sheet.getRange(row, idCol).getValue() || '').trim();
    if (!quoteId) return;

    if (newStatus === 'ИЛГЭЭХ') {
      sendQuoteToCustomer_(quoteId, sheet, row);
    } else if (newStatus === 'ГЭРЭЭ') {
      generateContract_(quoteId, sheet, row, headers);
    }
    // бусад статус → юу ч хийхгүй
  } catch (err) {
    console.error('NOMAAD onEdit алдаа:', err);
    // Гар алдаатай үед хэрэглэгчид мэдэгдэх
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Алдаа: ' + (err && err.message ? err.message : err),
      'NOMAAD',
      10
    );
  }
}

/**
 * Workflow 2 → Customer Gmail draft бэлдэх
 */
function sendQuoteToCustomer_(quoteId, sheet, row) {
  const url = WEBHOOK_SEND + '?id=' + encodeURIComponent(quoteId);
  const resp = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('WF2 webhook ' + code + ': ' + resp.getContentText().slice(0, 200));
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(
    quoteId + ' → Gmail draft бэлдэгдэж байна...',
    'NOMAAD',
    8
  );
}

/**
 * Workflow 3 → Гэрээ Google Doc автомат үүсгэх
 *   POST body нь тухайн мөрийн бүх өгөгдлийг JSON-оор дамжуулна
 *   (n8n IF node-д Төлөв шалгах учир бүх багана хэрэгтэй)
 */
function generateContract_(quoteId, sheet, row, headers) {
  // Тухайн мөрийн утгуудыг түлхүүр-утга object болгоно
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  const body = {};
  for (let i = 0; i < headers.length; i++) {
    let v = values[i];
    // Огнооны object бол ISO string болгож илгээнэ
    if (v instanceof Date) v = v.toISOString();
    body[headers[i]] = v;
  }

  const resp = UrlFetchApp.fetch(WEBHOOK_CONTRACT, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
    followRedirects: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('WF3 webhook ' + code + ': ' + resp.getContentText().slice(0, 200));
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(
    quoteId + ' → Гэрээ үүсэж байна...',
    'NOMAAD',
    8
  );
}

/**
 * MENU — гар ажиллагаа
 * Quote Log нээхэд "NOMAAD" гэдэг menu гарч ирнэ, тэндээс
 * сонгосон мөрөнд webhook дахин дуудаж болно.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('NOMAAD')
    .addItem('Сонгосон мөрд: Quote дахин илгээх', 'menuResend_')
    .addItem('Сонгосон мөрд: Гэрээ дахин үүсгэх', 'menuRegenContract_')
    .addToUi();
}

function menuResend_() {
  const sel = SpreadsheetApp.getActiveSheet().getActiveRange();
  const row = sel.getRow();
  const sheet = sel.getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol = headers.indexOf(ID_COL_NAME) + 1;
  if (!idCol) { SpreadsheetApp.getUi().alert('ID багана олдсонгүй.'); return; }
  const quoteId = String(sheet.getRange(row, idCol).getValue() || '').trim();
  if (!quoteId) { SpreadsheetApp.getUi().alert('ID хоосон байна.'); return; }
  sendQuoteToCustomer_(quoteId, sheet, row);
}

function menuRegenContract_() {
  const sel = SpreadsheetApp.getActiveSheet().getActiveRange();
  const row = sel.getRow();
  const sheet = sel.getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol = headers.indexOf(ID_COL_NAME) + 1;
  if (!idCol) { SpreadsheetApp.getUi().alert('ID багана олдсонгүй.'); return; }
  const quoteId = String(sheet.getRange(row, idCol).getValue() || '').trim();
  if (!quoteId) { SpreadsheetApp.getUi().alert('ID хоосон байна.'); return; }
  generateContract_(quoteId, sheet, row, headers);
}
