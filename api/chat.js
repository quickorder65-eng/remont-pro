module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfiguration' });

  const body = req.body || {};
  const message = (body.message || '').toString().trim();
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) return res.status(400).json({ error: 'Missing message' });

  const systemPrompt = `Ты ИИ-ассистент ремонтной компании РемонтПро (Алматы). Отвечай коротко, понятно и вежливо. Твоя задача — помогать клиенту получить информацию по ремонту, уточнять площадь, тип объекта, вид ремонта, город, сроки начала и бюджет. Не обещай точную стоимость без замера. Можно давать только примерный диапазон. Если клиент спрашивает цену, сначала уточни площадь и тип ремонта. Если клиент готов к следующему шагу, предложи созвон или замер. Если клиент согласен, попроси имя, телефон и удобное время. После получения контакта скажи, что заявка передана менеджеру.

Ценовые ориентиры (тг/м²): косметический — 60 000, стандарт — 90 000, под ключ — 130 000, премиум — 180 000. При запросе цены давай диапазон ±15% и указывай: "Предварительная стоимость: от [сумма] до [сумма] тг. Точная сумма зависит от состояния объекта, материалов и замера."`;

  // Keep last 10 turns to stay within token limits
  const trimmedHistory = history
    .filter(m => m.role && Array.isArray(m.parts) && m.parts[0]?.text)
    .slice(-20);

  const contents = [
    ...trimmedHistory,
    { role: 'user', parts: [{ text: message }] }
  ];

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 400, temperature: 0.75 }
        })
      }
    );

    if (!geminiRes.ok) {
      console.error('Gemini error:', geminiRes.status, await geminiRes.text());
      return res.status(502).json({ error: 'Gemini API unavailable' });
    }

    const data = await geminiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!reply) return res.status(502).json({ error: 'Empty Gemini response' });

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
