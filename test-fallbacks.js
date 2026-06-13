import Groq from "groq-sdk";
import OpenAI from "openai";

async function test() {
  try {
    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const res = await groqClient.chat.completions.create({
      messages: [{ role: "user", content: "Halo" }],
      model: "llama-3.3-70b-versatile",
    });
    console.log("Groq success:", res.choices[0].message.content);
  } catch (e) {
    console.log("Groq err:", e.message);
  }
  
  try {
    const openaiClient = new OpenAI({ 
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY 
    });
    const res2 = await openaiClient.chat.completions.create({
      messages: [{ role: "user", content: "Halo" }],
      model: "meta-llama/llama-3.1-8b-instruct:free",
    });
    console.log("OR success:", res2.choices[0].message.content);
  } catch(e) {
    console.log("OR err:", e.message);
  }
}
test();
