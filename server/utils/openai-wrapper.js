// server/utils/openai-wrapper.js
const OpenAI = require("openai");
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ OPENAI_API_KEY not set");
  process.exit(1);
}
const openai = new OpenAI({ apiKey });
async function generateText(prompt) {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  return response.choices[0].message.content.trim();
}


async function generateChart(prompt) {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "system", content: "You're a chart-generating assistant using Chart.js." }, { role: "user", content: prompt }],
    temperature: 0.3,
  });
  return response.choices[0].message.content.trim();
}


module.exports = { generateText, generateChart};
