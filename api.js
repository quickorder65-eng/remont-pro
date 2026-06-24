/* ═══════════════════════════════════════════
   api.js — Google Sheets CRM integration
   Единственное место для URL и логики отправки
   ═══════════════════════════════════════════ */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJFmIZVzMWa86yVw8zi07WZzJeJwMideAW5hMSDuAC36wdzDTc1S60-aLF8HwLfP-G/exec';
// Пример: 'https://script.google.com/macros/s/AKfycb.../exec'

/**
 * Отправляет заявку в Google Sheets через Apps Script.
 * @param {Object} payload - данные заявки
 * @param {Function} onDone - колбэк после отправки (вызывается всегда)
 */
function sendLead(payload, onDone) {
  const fd = new FormData();
  fd.append('name',          (payload.name          || '').toString().trim());
  fd.append('phone',         (payload.phone         || '').toString().replace(/[^\d]/g, ''));
  fd.append('objectType',    (payload.objectType    || '').toString().trim());
  fd.append('area',          (payload.area          || '').toString().trim());
  fd.append('repairType',    (payload.repairType    || '').toString().trim());
  fd.append('designProject', (payload.designProject || '').toString().trim());
  fd.append('startTime',     (payload.startTime     || '').toString().trim());
  fd.append('source',        (payload.source        || 'quiz').toString().trim());

  fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: fd })
    .then(() => onDone && onDone())
    .catch(() => onDone && onDone()); // CORS не прерывает успешную запись — вызываем onDone
}
