import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Streaming endpoint
router.post('/', async (req, res) => {
  try {
    const { destinations = [], preferences = '', days = 3, tiktokTips = '' } = req.body || {};
    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
    if (!HUGGINGFACE_API_KEY) {
      return res.status(400).json({ error: 'Set HUGGINGFACE_API_KEY in server env' });
    }

    const destList = destinations.map((d, i) => `${i + 1}. ${d.name}${d.description ? ` - ${d.description}` : ''}`).join('\n');
    
    // Build the prompt with TikTok tips if available
    let tiktokSection = '';
    if (tiktokTips) {
      tiktokSection = `\n\nIMPORTANT - Include these specific recommendations from travel videos:\n${tiktokTips}\n`;
    }
    
    const prompt = `You are a travel planner. Create a ${days}-day travel itinerary.

Destinations: ${destList}
Preferences: ${preferences || 'general sightseeing'}${tiktokSection}

Write ONLY the itinerary in this exact plain text format (no JSON, no code, no thinking, no explanations):

Day 1 - [Theme]
9:00 AM - [Activity name]: [Brief description]
12:00 PM - [Activity name]: [Brief description]
...

Day 2 - [Theme]
...

Start your response with "Day 1" immediately. Do not include any other text before or after the itinerary.`;

    const modelId = 'Qwen/Qwen2.5-72B-Instruct';
    const endpoint = 'https://router.huggingface.co/v1/chat/completions';

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      res.write(`data: ${JSON.stringify({ error: err })}\n\n`);
      res.end();
      return;
    }

    let fullContent = '';

    // Stream the response
    for await (const chunk of response.body) {
      const text = chunk.toString();
      const lines = text.split('\n').filter(line => line.startsWith('data: '));
      
      for (const line of lines) {
        const data = line.slice(6); // Remove 'data: ' prefix
        if (data === '[DONE]') {
          // Send final parsed result
          const tryParseJson = (text) => {
            if (!text) return null;
            const m = text.match(/\{[\s\S]*\}/);
            if (!m) return null;
            try { return JSON.parse(m[0]); } catch { return null; }
          };
          const itinerary = tryParseJson(fullContent);
          res.write(`data: ${JSON.stringify({ done: true, itinerary, raw: fullContent })}\n\n`);
          res.end();
          return;
        }
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        } catch {}
      }
    }

    res.end();
  } catch (err) {
    console.error('Generate error:', err);
    res.write(`data: ${JSON.stringify({ error: 'Generate failed' })}\n\n`);
    res.end();
  }
});

export default router;
