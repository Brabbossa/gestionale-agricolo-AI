import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function run() {
  try {
    console.log("Key starting with:", process.env.GEMINI_API_KEY.substring(0, 5));
    const aiRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "hello",
      config: {
        systemInstruction: "test",
        responseMimeType: 'application/json',
      },
    });
    console.log("Success:", aiRes.text);
  } catch (e) {
    console.error("SDK Error:", e);
  }
}
run();
