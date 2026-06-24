// ═══════════════════════════════════════════════
// Google Apps Script — CRM + Google Calendar + Telegram
// Remont Demo
//
// Установка:
// 1. script.google.com → новый проект → вставить этот код
// 2. Project Settings → Script Properties → добавить:
//      TELEGRAM_BOT_TOKEN  =  токен от @BotFather
//      TELEGRAM_CHAT_ID    =  ваш ID от @userinfobot
// 3. Деплой → Web App → "Anyone", "Execute as Me"
// 4. Скопировать URL в api.js → GOOGLE_SCRIPT_URL
// ═══════════════════════════════════════════════

var CALENDAR_ID = 'primary'; // основной календарь аккаунта

function doPost(e) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Leads') || ss.getActiveSheet();

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
    sheet.getRange('C:C').setNumberFormat('@');

    var calendarNote = '';

    // Google Calendar — только для ИИ-чата
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

    if (source === 'ИИ-чат') {
      sheet.getRange(nextRow, 1, 1, 10).setBackground('#fff8e1');
    }

    // Telegram-уведомление для всех заявок
    try {
      sendTelegramNotification(name, phone, source, objectType, area, repairType);
    } catch (tgErr) {
      Logger.log('Telegram error: ' + tgErr.message);
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

// ─── Telegram ────────────────────────────────────
function sendTelegramNotification(name, phone, source, objectType, area, repairType) {
  var props  = PropertiesService.getScriptProperties();
  var token  = props.getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = props.getProperty('TELEGRAM_CHAT_ID');

  if (!token || !chatId) {
    Logger.log('Telegram: TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не настроены');
    return;
  }

  var sourceIcon = source === 'ИИ-чат' ? '🤖' : '📋';
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm');

  var lines = [
    '🔔 <b>Новая заявка!</b>',
    '',
    sourceIcon + ' Источник: ' + source,
    '👤 Имя: ' + (name  || 'не указано'),
    '📱 Телефон: ' + (phone || 'не указано'),
  ];

  if (objectType) lines.push('🏠 Объект: ' + objectType);
  if (area)       lines.push('📐 Площадь: ' + area);
  if (repairType) lines.push('🔨 Вид ремонта: ' + repairType);

  lines.push('', '📅 ' + now, '', '✅ Связаться сегодня!');

  var text = lines.join('\n');

  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id:    chatId,
      text:       text,
      parse_mode: 'HTML'
    }),
    muteHttpExceptions: true
  });
}

// ─── Google Calendar ──────────────────────────────
function createConsultationEvent(clientName, clientPhone) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID)
                 || CalendarApp.getDefaultCalendar();

  var start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);

  var end = new Date(start);
  end.setHours(11, 0, 0, 0);

  var title = 'Консультация по ремонту' + (clientName ? ' — ' + clientName : '');
  var description =
    'Клиент оставил заявку через ИИ-ассистента на сайте.\n' +
    'Нужно связаться и уточнить детали ремонта.\n\n' +
    'Имя: ' + (clientName  || 'не указано') + '\n' +
    'Телефон: ' + (clientPhone || 'не указано');

  var event = calendar.createEvent(title, start, end, { description: description });

  return 'Создано: ' + event.getTitle() + ' ' +
    Utilities.formatDate(start, Session.getScriptTimeZone(), 'dd.MM HH:mm');
}

function doGet() {
  return ContentService
    .createTextOutput('CRM + Calendar + Telegram script is working ✓')
    .setMimeType(ContentService.MimeType.TEXT);
}
