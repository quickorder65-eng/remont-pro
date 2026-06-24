module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ error: 'Telegram credentials not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { name, phone, source = 'ИИ-чат', objectType, area, repairType } = body;

  if (!phone) return res.status(400).json({ error: 'Missing phone' });

  const sourceIcon = source === 'ИИ-чат' ? '🤖' : '📋';
  const now = new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const lines = [
    `🔔 <b>Новая заявка!</b>`,
    ``,
    `${sourceIcon} Источник: ${source}`,
    `👤 Имя: ${name || 'не указано'}`,
    `📱 Телефон: ${phone}`,
  ];

  if (objectType) lines.push(`🏠 Объект: ${objectType}`);
  if (area)       lines.push(`📐 Площадь: ${area}`);
  if (repairType) lines.push(`🔨 Вид ремонта: ${repairType}`);

  lines.push(``, `📅 ${now}`, ``, `✅ Связаться сегодня!`);

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    chatId,
          text:       lines.join('\n'),
          parse_mode: 'HTML'
        })
      }
    );

    const data = await tgRes.json();
    if (!tgRes.ok) {
      console.error('Telegram error:', data);
      return res.status(502).json({ error: 'Telegram error', detail: data.description });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('notify handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
