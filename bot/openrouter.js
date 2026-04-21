const getSystemPrompt = require("./systemPrompt");

/**
 * Send a message to OpenRouter (supports any model, e.g. claude-3-haiku, llama-3, gpt-4o, etc.)
 * @param {string} userMessage
 * @param {Array}  history  - [{role: "user"|"assistant", content: string}]
 * @returns {string} AI reply text
 */
const chat = async (userMessage, history = []) => {
  const systemPromptText = await getSystemPrompt();

  // Build messages array: system + prior history + new user message
  const messages = [
    { role: "system", content: systemPromptText },
    ...history.map((m) => ({
      role: m.role === "model" ? "assistant" : m.role, // convert Gemini "model" → "assistant"
      content: Array.isArray(m.parts) ? m.parts.map((p) => p.text).join("") : m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://satvikmeals.com",
      "X-Title": "SatvikMeals WhatsApp Bot",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-8b-instruct:free",
      messages,
      max_tokens: 500,
      temperature: 0.75,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) throw new Error("Empty response from OpenRouter");
  return text;
};

module.exports = { chat };
