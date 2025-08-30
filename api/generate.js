// This file acts as a secure backend proxy.
// It receives requests from our frontend (insightq.html),
// securely adds the secret API key, and forwards the request to the Google Gemini API.

export default async (req, res) => {
    // 1. Check for the correct request method (POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Get the prompt from the request body sent by the frontend
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // 3. Securely get the API key from environment variables
    //    We will set this variable in the Vercel dashboard, not in the code.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key is not configured' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // 4. Construct the payload to send to the Gemini API
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        // 5. Forward the request to the real Gemini API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini API Error:', errorBody);
            return res.status(response.status).json({ error: 'Failed to fetch from Gemini API', details: errorBody });
        }

        const result = await response.json();
        
        // 6. Extract the generated text and send it back to our frontend
        const responseText = result.candidates[0].content.parts[0].text;
        const jsonResponse = JSON.parse(responseText);

        // Set CORS headers to allow requests from our GitHub Pages site
        res.setHeader('Access-Control-Allow-Origin', '*'); // For simplicity, allow all. For production, you can restrict this to your GitHub pages URL.
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        return res.status(200).json(jsonResponse);

    } catch (error) {
        console.error('Error in serverless function:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

