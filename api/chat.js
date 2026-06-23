// Preferred models (newest first). If none match what the key can access,
// we fall back to whatever generateContent-capable model ListModels returns.
const PREFERRED = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
];

const SYSTEM_PROMPT = `Ты ИИ-ассистент ремонтной компании РемонтПро (Алматы). Отвечай коротко, понятно и вежливо. Твоя задача — помогать клиенту получить информацию по ремонту, уточнять площадь, тип объекта, вид ремонта, город, сроки начала и бюджет. Не обещай точную стоимость без замера. Можно давать только примерный диапазон. Если клиент спрашивает цену, сначала уточни площадь и тип ремонта. Если клиент готов к следующему шагу, предложи созвон или замер. Если клиент согласен, попроси имя, телефон и удобное время. После получения контакта скажи, что заявка передана менеджеру.

Ценовые ориентиры (тг/м²): косметический — 60 000, стандарт — 90 000, под ключ — 130 000, премиум — 180 000. При запросе цены давай диапазон ±15% и указывай: "Предварительная стоимость: от [сумма] до [сумма] тг. Точная сумма зависит от состояния объекта, материалов и замера."`;

let cachedOrder = null; // cache the resolved try-order across warm invocations

async function listModels(apiKey) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${apiKey}`);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => (m.name || '').replace(/^models\//, ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveOrder(apiKey) {
  if (cachedOrder) return cachedOrder;
  const available = await listModels(apiKey);
  let order;
  if (available.length) {
    const pref = PREFERRED.filter(m => available.includes(m));
    const otherFlash = available.filter(m => /flash/i.test(m) && !pref.includes(m));
    const rest = available.filter(m => !pref.includes(m) && !otherFlash.includes(m));
    order = [...pref, ...otherFlash, ...rest];
  } else {
    // ListModels unavailable — fall back to preferred guesses
    order = PREFERRED.slice();
  }
  cachedOrder = order.slice(0, 6);
  return cachedOrder;
}

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

  const order = await resolveOrder(apiKey);
  let lastDetail = 'no models tried';

  for (const model of order) {
    try {
      const { ok, status, text: rawText } = await callGemini(apiKey, model, contents);
      if (!ok) {
        lastDetail = `[${model}] ${status}`;
        // model-specific problem -> try next; reset cache so next request re-resolves
        if (status === 404) cachedOrder = null;
        continue;
      }
      let data;
      try { data = JSON.parse(rawText); } catch { lastDetail = `[${model}] bad JSON`; continue; }
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (!reply) { lastDetail = `[${model}] empty reply`; continue; }
      return res.status(200).json({ reply, model });
    } catch (err) {
      lastDetail = `[${model}] ${err.message || 'fetch failed'}`;
    }
  }

  return res.status(502).json({ error: 'AI temporarily unavailable', triedModels: order, last: lastDetail });
};
