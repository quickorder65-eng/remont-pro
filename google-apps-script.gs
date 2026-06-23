// ═══════════════════════════════════════════════
// Google Apps Script — CRM для Remont Demo
// Вставить в: script.google.com → новый проект
// Деплой: Web App, Anyone, Execute as Me
// ═══════════════════════════════════════════════

function doPost(e) {
  try {
    var sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName('Leads');

    if (!sheet) {
      sheet = SpreadsheetApp
        .getActiveSpreadsheet()
        .getActiveSheet();
    }

    // Добавить заголовки если таблица пустая
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 9).setValues([[
        'Дата и время', 'Имя', 'Телефон', 'Тип объекта',
        'Площадь', 'Вид ремонта', 'Дизайн-проект', 'Сроки начала', 'Источник'
      ]]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }

    var name        = String(e.parameter.name         || '').trim();
    var phone       = String(e.parameter.phone        || '').replace(/[^\d]/g, '').trim();
    var objectType  = String(e.parameter.objectType   || '').trim();
    var area        = String(e.parameter.area         || '').trim();
    var repairType  = String(e.parameter.repairType   || '').trim();
    var designProject = String(e.parameter.designProject || '').trim();
    var startTime   = String(e.parameter.startTime    || '').trim();
    var source      = String(e.parameter.source       || 'quiz').trim();

    if (!phone) {
      return ContentService.createTextOutput('error: phone is required');
    }

    var nextRow = sheet.getLastRow() + 1;

    // Колонка C — телефон как текст (избегаем #ERROR)
    sheet.getRange('C:C').setNumberFormat('@');

    sheet.getRange(nextRow, 1, 1, 9).setValues([[
      new Date(),
      name,
      phone,
      objectType,
      area,
      repairType,
      designProject,
      startTime,
      source
    ]]);

    return ContentService
      .createTextOutput('ok')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService
      .createTextOutput('error: ' + err.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('CRM script is working ✓')
    .setMimeType(ContentService.MimeType.TEXT);
}
