import { GoogleGenAI } from "@google/genai";
import process from "process";
const aiClient = new GoogleGenAI({
  apiKey: "invalid_trigger",
  httpOptions: {
    headers: {
      Authorization: `Bearer ${process.env.GEMINI_API_KEY}`
    }
  }
});
aiClient.models.generateContent({
  model: "gemini-3.5-flash",
  contents: "hi"
}).then(r => console.log(r.text)).catch(e => console.error("Error:", e.message));
