const getSystemPrompt = require("./systemPrompt");

/**
 * Send a message to OpenRouter API
 */
const chat = async (userMessage, history = []) => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // ── Key check ──
  if (!apiKey || apiKey.trim() === "" || apiKey === "sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx") {
    throw new Error("OPENROUTER_API_KEY is not set or is still the placeholder value. Set it in Render Environment Variables.");
  }

  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-8b-instruct:free";
  console.log(`[OpenRouter] Using model: ${model}`);

  const systemPromptText = await getSystemPrompt();

  const messages = [
    { role: "system", content: systemPromptText },
    ...history.map((m) => ({
      role: m.role === "model" ? "assistant" : m.role,
      content: Array.isArray(m.parts) ? m.parts.map((p) => p.text).join("") : (m.content || ""),
    })),
    { role: "user", content: userMessage },
  ];

  console.log(`[OpenRouter] Sending request — history: ${history.length} msgs`);

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://satvikmeals.com",
        "X-Title": "SatvikMeals WhatsApp Bot",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 500,
        temperature: 0.75,
        top_p: 0.9,
      }),
    });
  } catch (networkErr) {
    throw new Error(`Network error calling OpenRouter: ${networkErr.message}`);
  }

  // ── Read raw body for debugging ──
  const rawBody = await response.text();
  console.log(`[OpenRouter] Status: ${response.status}`);
  console.log(`[OpenRouter] Raw response: ${rawBody.slice(0, 300)}`);

  if (!response.ok) {
    throw new Error(`OpenRouter API error ${response.status}: ${rawBody}`);
  }

  let data;
  try {
    data = JSON.parse(rawBody);
  } catch (e) {
    throw new Error(`Could not parse OpenRouter response: ${rawBody.slice(0, 200)}`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error(`Empty reply from OpenRouter. Full response: ${rawBody.slice(0, 300)}`);
  }

  console.log(`[OpenRouter] ✅ Got reply (${text.length} chars)`);
  return text;
};

module.exports = { chat };
