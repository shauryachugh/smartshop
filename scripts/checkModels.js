import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
let apiKey = '';
for (const line of env.split('\n')) {
  if (line.startsWith('GEMINI_API_KEY=')) {
    apiKey = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
}

const ai = new GoogleGenAI({ apiKey });

const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];

for (const m of models) {
  try {
    const t0 = Date.now();
    const res = await ai.models.generateContent({
      model: m,
      contents: 'Reply in one word: OK',
    });
    console.log(`${m}: SUCCESS in ${Date.now() - t0}ms -> ${res.text.trim()}`);
  } catch (err) {
    console.log(`${m}: ERROR: ${err.message}`);
  }
}
