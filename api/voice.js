// api/voice.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { audioBase64 } = await req.json();

    // Send to Deepgram (STT)
    const stt = await fetch('https://api.deepgram.com/v1/listen?model=nova-2-general', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: Buffer.from(audioBase64, 'base64')
    });
    const sttData = await stt.json();
    const transcript = sttData.results.channels[0].alternatives[0].transcript || "";

    // Send transcript to Gemini
    const gemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: transcript }]}],
          generationConfig: { maxOutputTokens: 200 }
        })
      }
    );
    const geminiData = await gemini.json();
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I didn't catch that.";

    return res.status(200).json({ transcript, reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
