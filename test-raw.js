import fetch from 'node-fetch';
import process from 'process';

async function run() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
    },
    body: JSON.stringify({
      contents: [{parts: [{text: "Hello"}]}]
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
