
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // NOTE: On Vercel, use GEMINI_API_KEY (non-VITE prefix) to keep it secret.
  // For local development, this will look in process.env
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const MODEL_ID = 'gemini-3.1-flash-tts-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`;

  try {
    const body = await req.json();
    
    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await googleResponse.json();
    
    return new Response(JSON.stringify(data), {
      status: googleResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to proxy request', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
