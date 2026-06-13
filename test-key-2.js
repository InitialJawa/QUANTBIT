import fetch from 'node-fetch';
import process from 'process';

async function run({ key, name }) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    body: JSON.stringify({
      contents: [{parts: [{text: "Hi"}]}]
    })
  });
  console.log('Result for ' + name + ':', res.status);
  const text = await res.text();
  console.log(text.substring(0, 100)); // only first 100 chars
}
run({ key: process.env.GEMINI_API_KEY, name: 'gemini' });
run({ key: process.env.GOAPI_API_KEY, name: 'goapi' });
run({ key: process.env.GROQ_API_KEY, name: 'groq' });
run({ key: process.env.OPENROUTER_API_KEY, name: 'or' });
