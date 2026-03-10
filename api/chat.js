export default async function handler(req, res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
            return res.status(200).end();
  }

  if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
            const { prompt } = req.body;

          if (!prompt) {
                      return res.status(400).json({ error: 'No prompt provided' });
          }

          const apiKey = process.env.GEMINI_API_KEY;

          if (!apiKey) {
                      return res.status(500).json({ error: 'AI service not configured. Please set GEMINI_API_KEY in Vercel environment variables.' });
          }

          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

          const response = await fetch(url, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                                    contents: [{ parts: [{ text: prompt }] }],
                                    generationConfig: {
                                                    temperature: 0.7,
                                                    maxOutputTokens: 2048
                                    }
                      })
          });

          const data = await response.json();

          if (!response.ok) {
                      const errMsg = data?.error?.message || `Gemini API error: ${response.status}`;
                      return res.status(502).json({ error: errMsg });
          }

          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!text) {
                      const finishReason = data?.candidates?.[0]?.finishReason;
                      if (finishReason && finishReason !== 'STOP') {
                                    return res.status(200).json({ text: `Response blocked: ${finishReason}. Please try rephrasing.` });
                      }
                      return res.status(200).json({ text: 'No response generated. Please try again.' });
          }

          return res.status(200).json({ text });

  } catch (error) {
            console.error('AI handler error:', error);
            return res.status(500).json({ error: 'Failed to connect to AI: ' + error.message });
  }
}
