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
                          return res.status(500).json({ error: 'AI service not configured. Please add GEMINI_API_KEY to Vercel environment variables.' });
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
                          const rawMsg = data?.error?.message || '';
                          let userMsg = `Gemini API error (${response.status})`;
                          if (rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('free_tier')) {
                                          userMsg = 'Gemini API quota exceeded. Please enable billing at https://aistudio.google.com or check your API key quota at https://ai.dev/rate-limit.';
                          } else if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key')) {
                                          userMsg = 'Invalid Gemini API key. Please update GEMINI_API_KEY in Vercel environment variables.';
                          } else if (rawMsg) {
                                          userMsg = rawMsg.split('\n')[0];
                          }
                          return res.status(502).json({ error: userMsg });
            }

            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                          const finishReason = data?.candidates?.[0]?.finishReason;
                          if (finishReason && finishReason !== 'STOP') {
                                          return res.status(200).json({ text: `Response blocked (${finishReason}). Please try rephrasing your question.` });
                          }
                          return res.status(200).json({ text: 'No response generated. Please try again.' });
            }

            return res.status(200).json({ text });

  } catch (error) {
              console.error('AI handler error:', error);
              return res.status(500).json({ error: 'Failed to connect to AI: ' + error.message });
  }
}
