
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
    
    // Build the input — use SSML if the client sends it, otherwise plain text
    const inputPayload = body.ssml
      ? { ssml: body.ssml }
      : { text: body.text };

    // Standard Google Cloud TTS synthesis request
    // Chirp / Chirp-HD / Chirp3-HD voices reject custom pitch, speakingRate, and effectsProfileId.
    // Only apply Indian accent tuning to Neural2 / WaveNet / Standard voices.
    const voiceName = body.voiceName || 'en-IN-Neural2-D';
    const isChirp = /Chirp/i.test(voiceName);
    
    // Build audioConfig based on voice capability
    const audioConfig: Record<string, any> = { audioEncoding: 'MP3' };
    
    if (!isChirp) {
      // Neural2/WaveNet/Standard — apply Indian accent tuning
      const isIndianVoice = (body.languageCode || 'en-IN').startsWith('en-IN');
      audioConfig.pitch = body.pitch ?? (isIndianVoice ? -1.0 : 0);
      audioConfig.speakingRate = body.speakingRate ?? (isIndianVoice ? 0.95 : 1.0);
      audioConfig.effectsProfileId = ['large-home-entertainment-class-device'];
    }
    // Chirp HD: leave audioConfig at just { audioEncoding: 'MP3' } — no tuning

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: inputPayload,
        voice: { 
          languageCode: body.languageCode || 'en-IN', 
          name: voiceName
        },
        audioConfig
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
