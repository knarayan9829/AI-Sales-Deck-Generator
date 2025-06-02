// server/utils/openai-wrapper.js
const OpenAI = require("openai");

// Make sure your .env contains:
//    OPENAI_API_KEY=sk-...
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌  OPENAI_API_KEY is not set in .env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

/**
 * Send a prompt to GPT and return the text response.
 * Here we use a chat-based model (gpt-3.5-turbo). Adjust as needed.
 */
async function generateText(prompt) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  });
  return response.choices[0].message.content.trim();
}

module.exports = { generateText };
