import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = 'http://localhost:5175'; // Update if your frontend runs on a different port
const SITE_NAME = 'DocuChat AI';

console.log('--- Server Startup Debug ---');
console.log('Current working directory:', process.cwd());
console.log('OPENROUTER_API_KEY present:', !!OPENROUTER_API_KEY);
if (OPENROUTER_API_KEY) {
    console.log('OPENROUTER_API_KEY length:', OPENROUTER_API_KEY.length);
    console.log('OPENROUTER_API_KEY starts with:', OPENROUTER_API_KEY.substring(0, 10) + '...');
} else {
    console.error('CRITICAL: OPENROUTER_API_KEY is missing in process.env');
}
console.log('----------------------------');

app.get('/', (req, res) => {
    res.send('Backend Server is running');
});

// Summarization Endpoint
app.post('/api/summarize', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log('--- Summarize Request ---');
        console.log('Received text length:', text.length);
        console.log('Text preview:', text.substring(0, 200) + '...');
        console.log('-------------------------');

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'mistralai/mistral-7b-instruct:free',
                messages: [
                    {
                        role: 'user',
                        content: `Analyze this document and provide a structured summary. Respond ONLY with valid JSON (no markdown, no backticks, no preamble).

Document text:
${text.substring(0, 30000)}

Required JSON format:
{
  "short": "2-3 sentence summary",
  "detailed": "One detailed paragraph summary",
  "bullets": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': SITE_URL,
                    'X-Title': SITE_NAME,
                    'Content-Type': 'application/json'
                }
            }
        );

        let content = response.data.choices[0].message.content.trim();
        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        try {
            const parsed = JSON.parse(content);
            res.json(parsed);
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            console.error('Raw content:', content);
            res.status(500).json({ error: 'Failed to parse summary response', raw: content });
        }

    } catch (error) {
        console.error('Summarization error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate summaries' });
    }
});

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'mistralai/mistral-7b-instruct:free',
                messages: messages
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': SITE_URL,
                    'X-Title': SITE_NAME,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ content: response.data.choices[0].message.content });

    } catch (error) {
        console.error('Chat error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate chat response' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});