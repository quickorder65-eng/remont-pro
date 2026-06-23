// ═══════════════════════════════════════════════
// Google Apps Script — CRM + Google Calendar
// Remont Demo
//
// Установка:
// 1. script.google.com → новый проект → вставить этот код
// 2. Деплой → Web App → "Anyone", "Execute as Me"
// 3. Скопировать URL в api.js → GOOGLE_SCRIPT_URL
// ═══════════════════════════════════════════════

var CALENDAR_ID = 'primary'; // 'primary' = основной календарь аккаунта
// Чтобы использовать другой — вставьте ID нужного календаря (из настроек Google Calendar)

function doPost(e) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Leads') || ss.getActiveSheet();

    // Заголовки при первом запуске
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 10).setValues([[
        'Дата и время', 'Имя', 'Телефон', 'Тип объекта',
        'Площадь', 'Вид ремонта', 'Дизайн-проект',
        'Сроки начала', 'Источник', 'Событие в Calendar'
      ]]);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var name          = String(e.parameter.name          || '').trim();
    var phone         = String(e.parameter.phone         || '').replace(/[^\d+]/g, '').trim();
    var objectType    = String(e.parameter.objectType    || '').trim();
    var area          = String(e.parameter.area          || '').trim();
    var repairType    = String(e.parameter.repairType    || '').trim();
    var designProject = String(e.parameter.designProject || '').trim();
    var startTime     = String(e.parameter.startTime     || '').trim();
    var source        = String(e.parameter.source        || 'quiz').trim();

    if (!phone) {
      return ContentService.createTextOutput('error: phone is required');
    }

    var nextRow = sheet.getLastRow() + 1;
    sheet.getRange('C:C').setNumberFormat('@'); // телефон как текст

    var calendarNote = '';

    // Авто-создать событие в Google Calendar для лидов из ИИ-чата
    if (source === 'ИИ-чат') {
      try {
        calendarNote = createConsultationEvent(name, phone);
      } catch (calErr) {
        calendarNote = 'Ошибка: ' + calErr.message;
      }
    }

    sheet.getRange(nextRow, 1, 1, 10).setValues([[
      new Date(), name, phone, objectType,
      area, repairType, designProject,
      startTime, source, calendarNote
    ]]);

    // Подсветить строки из ИИ-чата золотым
    if (source === 'ИИ-чат') {
      sheet.getRange(nextRow, 1, 1, 10)
        .setBackground('#fff8e1');
    }

    return ContentService
      .createTextOutput('ok')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService
      .createTextOutput('error: ' + err.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// Создать событие в Google Calendar
function createConsultationEvent(clientName, clientPhone) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID)
                 || CalendarApp.getDefaultCalendar();

  // Событие — завтра в 10:00–11:00 (менеджер может перенести)
  var start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);

  var end = new Date(start);
  end.setHours(11, 0, 0, 0);

  var title = 'Консультация по ремонту' + (clientName ? ' — ' + clientName : '');
  var description =
    'Клиент оставил заявку через ИИ-ассистента на сайте.\n' +
    'Нужно связаться и уточнить детали ремонта.\n\n' +
    'Имя: ' + (clientName || 'не указано') + '\n' +
    'Телефон: ' + (clientPhone || 'не указано');

  var event = calendar.createEvent(title, start, end, {
    description: description
  });

  return 'Создано: ' + event.getTitle() + ' ' + Utilities.formatDate(start, Session.getScriptTimeZone(), 'dd.MM HH:mm');
}

function doGet() {
  return ContentService
    .createTextOutput('CRM + Calendar script is working ✓')
    .setMimeType(ContentService.MimeType.TEXT);
}
