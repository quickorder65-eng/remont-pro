const MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
];

const SYSTEM_PROMPT = `Ты ИИ-ассистент ремонтной компании РемонтПро (Алматы). Отвечай коротко, понятно и вежливо. Твоя задача — помогать клиенту получить информацию по ремонту, уточнять площадь, тип объекта, вид ремонта, город, сроки начала и бюджет. Не обещай точную стоимость без замера. Можно давать только примерный диапазон. Если клиент спрашивает цену, сначала уточни площадь и тип ремонта. Если клиент готов к следующему шагу, предложи созвон или замер. Если клиент согласен, попроси имя, телефон и удобное время. После получения контакта скажи, что заявка передана менеджеру.

Ценовые ориентиры (тг/м²): косметический — 60 000, стандарт — 90 000, под ключ — 130 000, премиум — 180 000. При запросе цены давай диапазон ±15% и указывай: "Предварительная стоимость: от [сумма] до [сумма] тг. Точная сумма зависит от состояния объекта, материалов и замера."`;

async function callGemini(apiKey, model, contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: 400, temperature: 0.75 }
    })
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured in Vercel Environment Variables' });
  }

  // Parse body — Vercel may pass it as string or object
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const message = (body.message || '').toString().trim();
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) return res.status(400).json({ error: 'Missing message' });

  const trimmedHistory = history
    .filter(m => m.role && Array.isArray(m.parts) && m.parts[0]?.text)
    .slice(-20);

  const contents = [
    ...trimmedHistory,
    { role: 'user', parts: [{ text: message }] }
  ];

  let lastError = null;

  for (const model of MODELS) {
    try {
      const { ok, status, text: rawText } = await callGemini(apiKey, model, contents);

      if (!ok) {
        console.error(`[${model}] error ${status}:`, rawText.slice(0, 300));
        lastError = { model, status, detail: rawText.slice(0, 400) };
        continue; // try next model
      }

      let data;
      try { data = JSON.parse(rawText); } catch {
        lastError = { model, detail: 'Invalid JSON: ' + rawText.slice(0, 200) };
        continue;
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (!reply) {
        lastError = { model, detail: 'Empty reply from Gemini', data };
        continue;
      }

      console.log(`[${model}] OK`);
      return res.status(200).json({ reply });

    } catch (err) {
      console.error(`[${model}] fetch failed:`, err.message);
      lastError = { model, detail: err.message };
    }
  }

  // All models failed
  return res.status(502).json({
    error: 'All Gemini models failed',
    last: lastError
  });
};
