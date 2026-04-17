
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

  // NOTE: On Vercel, use GOOGLE_CLOUD_API_KEY to keep it secret.
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.VITE_GOOGLE_CLOUD_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_CLOUD_API_KEY not configured on server' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  try {
    const body = await req.json();
    
    // Standard Google Cloud TTS synthesis request
    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: body.text },
        voice: { 
          languageCode: body.languageCode || 'en-IN', 
          name: body.voiceName || 'en-IN-Neural2-D' 
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1.0
        }
      }),
    });

    const data = await googleResponse.json();
    
    // Google Cloud TTS returns base64 in data.audioContent
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
