/* ═══════════════════════════════════════════
   REMONT DEMO — script.js
   ═══════════════════════════════════════════ */

// ─── CONFIG ───────────────────────────────
const GOOGLE_SCRIPT_URL = 'ВСТАВЬТЕ_URL_APPS_SCRIPT_СЮДА';
// После деплоя Apps Script вставьте Web App URL выше.
// Пример: 'https://script.google.com/macros/s/AKfycb.../exec'

// ─── NAV scroll ───────────────────────────
(function () {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();

// ─── BURGER / MOBILE MENU ─────────────────
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

burger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── FAQ ──────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ─── PROJECTS FILTER ──────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ─── QUIZ STATE ───────────────────────────
let quizCurrentStep = 1;
const QUIZ_TOTAL_STEPS = 6;
let quizSource = 'quiz';
let quizSubmitted = false;

const quizData = {
  objectType: '',
  area: '',
  repairType: '',
  designProject: '',
  startTime: '',
};

// ─── QUIZ OPEN / CLOSE ────────────────────
function openQuiz(source) {
  quizSource = source || 'quiz';
  quizCurrentStep = 1;
  quizSubmitted = false;
  resetQuizUI();
  document.getElementById('quizOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeQuiz() {
  document.getElementById('quizOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close on overlay click (not modal)
document.getElementById('quizOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeQuiz();
});

// ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeQuiz();
});

// ─── QUIZ RESET ───────────────────────────
function resetQuizUI() {
  // Reset data
  Object.keys(quizData).forEach(k => quizData[k] = '');
  document.getElementById('qName').value = '';
  document.getElementById('qPhone').value = '';
  document.getElementById('quizPhoneError').classList.remove('show');

  // Reset option selections
  document.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));

  // Show steps, hide success
  document.getElementById('quizBody').style.display = '';
  document.getElementById('quizFooter').style.display = '';
  document.getElementById('quizSuccess').classList.remove('show');

  // Reset next btn
  const nextBtn = document.getElementById('quizNext');
  nextBtn.disabled = false;
  nextBtn.textContent = 'Далее';

  updateQuizUI();
}

// ─── QUIZ UI UPDATE ───────────────────────
function updateQuizUI() {
  // Show correct step
  document.querySelectorAll('.quiz-step').forEach(step => {
    step.classList.toggle('active', Number(step.dataset.step) === quizCurrentStep);
  });

  // Progress
  const pct = Math.round((quizCurrentStep - 1) / QUIZ_TOTAL_STEPS * 100);
  document.getElementById('quizProgressFill').style.width = pct + '%';
  document.getElementById('quizProgressText').textContent = `Шаг ${quizCurrentStep} из ${QUIZ_TOTAL_STEPS}`;

  // Back btn
  document.getElementById('quizBack').disabled = quizCurrentStep === 1;

  // Next btn label on last step
  const nextBtn = document.getElementById('quizNext');
  nextBtn.textContent = quizCurrentStep === QUIZ_TOTAL_STEPS ? 'Получить расчёт' : 'Далее';
}

// ─── OPTION CLICK ─────────────────────────
document.querySelectorAll('.quiz-option').forEach(btn => {
  btn.addEventListener('click', () => {
    const field = btn.dataset.field;
    const value = btn.dataset.value;
    quizData[field] = value;

    // Deselect siblings in same step
    btn.closest('.quiz-options').querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// ─── NEXT ─────────────────────────────────
function quizNext() {
  if (quizCurrentStep < QUIZ_TOTAL_STEPS) {
    quizCurrentStep++;
    updateQuizUI();
    document.getElementById('quizModal').scrollTop = 0;
    return;
  }

  // Last step — submit
  if (quizSubmitted) return;
  submitQuiz();
}

// ─── PREV ─────────────────────────────────
function quizPrev() {
  if (quizCurrentStep > 1) {
    quizCurrentStep--;
    updateQuizUI();
    document.getElementById('quizModal').scrollTop = 0;
  }
}

// ─── SUBMIT ───────────────────────────────
function submitQuiz() {
  const name = document.getElementById('qName').value.trim();
  const rawPhone = document.getElementById('qPhone').value;
  const phone = rawPhone.replace(/[^\d]/g, '');

  const errEl = document.getElementById('quizPhoneError');
  if (!phone) {
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  const nextBtn = document.getElementById('quizNext');
  nextBtn.disabled = true;
  nextBtn.textContent = 'Отправка…';
  quizSubmitted = true;

  const formData = new FormData();
  formData.append('name', name);
  formData.append('phone', phone);
  formData.append('objectType', quizData.objectType);
  formData.append('area', quizData.area);
  formData.append('repairType', quizData.repairType);
  formData.append('designProject', quizData.designProject);
  formData.append('startTime', quizData.startTime);
  formData.append('source', quizSource || 'quiz');

  fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData })
    .then(() => showQuizSuccess())
    .catch(() => showQuizSuccess()); // show success even on CORS non-error
}

function showQuizSuccess() {
  document.getElementById('quizBody').style.display = 'none';
  document.getElementById('quizFooter').style.display = 'none';
  document.getElementById('quizSuccess').classList.add('show');
  document.getElementById('quizProgressFill').style.width = '100%';
  document.getElementById('quizProgressText').textContent = 'Готово!';
}

// ─── CHAT WIDGET ──────────────────────────
const chatHistory = [];
const chatLeadData = { name: '', phone: '', calendarUrl: '' };
let chatLeadSaved = false;
let chatSending = false;

function toggleChat() {
  const panel = document.getElementById('chatPanel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    setTimeout(() => document.getElementById('chatInput').focus(), 100);
  }
}

function sendQuickMsg(btn) {
  const input = document.getElementById('chatInput');
  input.value = btn.textContent.trim();
  sendChatMessage();
}

function addChatMsg(text, type) {
  const el = document.createElement('div');
  el.className = 'chat-msg ' + type;
  el.textContent = text;
  const msgs = document.getElementById('chatMessages');
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return el;
}

function addChatHtml(html, type) {
  const el = document.createElement('div');
  el.className = 'chat-msg ' + type;
  el.innerHTML = html;
  const msgs = document.getElementById('chatMessages');
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return el;
}

function showChatTyping() {
  const el = document.createElement('div');
  el.className = 'chat-typing';
  el.id = 'chatTypingIndicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  const msgs = document.getElementById('chatMessages');
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function hideChatTyping() {
  const el = document.getElementById('chatTypingIndicator');
  if (el) el.remove();
}

document.getElementById('chatInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

async function sendChatMessage() {
  if (chatSending) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  chatSending = true;
  document.getElementById('chatSend').disabled = true;

  addChatMsg(text, 'user');

  const quick = document.getElementById('chatQuick');
  if (quick) quick.style.display = 'none';

  showChatTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory })
    });

    hideChatTyping();

    if (!res.ok) throw new Error('API ' + res.status);

    const data = await res.json();
    const reply = data.reply || '';

    chatHistory.push({ role: 'user', parts: [{ text }] });
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });

    addChatMsg(reply, 'bot');

    extractLeadFromMessage(text);

    const isLeadConfirmed = /заявка передана|заявку менеджеру|передал заявку/i.test(reply);
    if (isLeadConfirmed && !chatLeadSaved && chatLeadData.phone) {
      saveChatLead();
    }
  } catch {
    hideChatTyping();
    addChatMsg('Ассистент временно недоступен. Оставьте телефон, и менеджер свяжется с вами.', 'bot');
  } finally {
    chatSending = false;
    document.getElementById('chatSend').disabled = false;
    input.focus();
  }
}

function extractLeadFromMessage(text) {
  const phoneRe = /(\+7|8)[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/;
  const match = text.match(phoneRe);
  if (match) chatLeadData.phone = match[0].replace(/[^\d+]/g, '');

  if (!chatLeadData.name && chatHistory.length >= 2) {
    const lastBot = chatHistory.filter(m => m.role === 'model').slice(-1)[0];
    if (lastBot) {
      const botText = lastBot.parts[0].text;
      const askedName = /как вас зовут|ваше имя|назовите имя/i.test(botText);
      if (askedName && !match && text.length < 40 && !/\d{4,}/.test(text)) {
        chatLeadData.name = text;
      }
    }
  }
}

function makeCalendarUrl(name, phone) {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);
  const fmt = d => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const title = encodeURIComponent('Консультация по ремонту');
  const details = encodeURIComponent(
    'Клиент оставил заявку через ИИ-ассистента на сайте. Нужно связаться и уточнить детали ремонта.' +
    (name ? '\nИмя: ' + name : '') +
    (phone ? '\nТелефон: ' + phone : '')
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${fmt(start)}/${fmt(end)}`;
}

function saveChatLead() {
  chatLeadSaved = true;
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU') + ' ' +
    now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  chatLeadData.calendarUrl = makeCalendarUrl(chatLeadData.name, chatLeadData.phone);

  addCrmRow({
    date: dateStr,
    name: chatLeadData.name || 'Не указано',
    phone: chatLeadData.phone || 'Не указано',
    calendarUrl: chatLeadData.calendarUrl
  });

  addChatHtml(
    '📅 <a href="' + chatLeadData.calendarUrl + '" target="_blank" style="color:var(--gold);text-decoration:underline;">Добавить встречу в Google Calendar</a>',
    'bot-cta'
  );

  const crmSection = document.getElementById('crmSection');
  if (crmSection) crmSection.style.display = '';
}

// ─── CRM TABLE ────────────────────────────
function addCrmRow({ date, name, phone, calendarUrl }) {
  const tbody = document.getElementById('crmBody');

  const emptyRow = tbody.querySelector('tr td[colspan]');
  if (emptyRow) emptyRow.closest('tr').remove();

  const calLink = calendarUrl
    ? `<a href="${calendarUrl}" target="_blank" class="crm-cal-link">📅 Google Calendar</a>`
    : '';

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${date}</td>
    <td>${name}</td>
    <td>${phone}</td>
    <td><span class="crm-badge crm-badge-source">ИИ-чат</span></td>
    <td><span class="crm-badge crm-badge-new">Новая</span></td>
    <td>Связаться сегодня${calLink}</td>
    <td><button class="crm-followup-btn" onclick="openFollowup()">Показать follow-up</button></td>
  `;
  tbody.appendChild(tr);
}

// ─── FOLLOW-UP MODAL ──────────────────────
function openFollowup() {
  document.getElementById('followupOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFollowup() {
  document.getElementById('followupOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function copyFollowup(elId, btn) {
  const text = document.getElementById(elId).textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Скопировано!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeFollowup();
  }
});

// ─── CONTACT FORM ─────────────────────────
document.getElementById('contactForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('cf-name').value.trim();
  const rawPhone = document.getElementById('cf-phone').value;
  const phone = rawPhone.replace(/[^\d]/g, '');
  const objectType = document.getElementById('cf-type').value;
  const comment = document.getElementById('cf-comment').value.trim();

  const errEl = document.getElementById('cfError');
  if (!phone) {
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  const btn = document.getElementById('cfBtn');
  btn.disabled = true;
  btn.textContent = 'Отправка…';

  const formData = new FormData();
  formData.append('name', name);
  formData.append('phone', phone);
  formData.append('objectType', objectType);
  formData.append('area', '');
  formData.append('repairType', comment);
  formData.append('designProject', '');
  formData.append('startTime', '');
  formData.append('source', 'contact_form');

  fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData })
    .then(() => {
      document.getElementById('contactForm').style.display = 'none';
      document.getElementById('cfSuccess').classList.add('show');
    })
    .catch(() => {
      document.getElementById('contactForm').style.display = 'none';
      document.getElementById('cfSuccess').classList.add('show');
    });
});
