
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

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { text, voice = 'alloy', instructions, speed } = body;

    // gpt-4o-mini-tts supports voice instructions for accent/tone control
    const requestBody: any = {
      model: 'gpt-4o-mini-tts',
      input: text,
      voice,
      response_format: 'mp3',
    };

    if (instructions) {
      requestBody.instructions = instructions;
    }
    if (speed && speed >= 0.25 && speed <= 4.0) {
      requestBody.speed = speed;
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      return new Response(JSON.stringify(errorData), {
        status: openAIResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert the binary audio to base64 to match the same interface as other TTS services
    const audioBuffer = await openAIResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return new Response(JSON.stringify({ audioContent: base64Audio }), {
      status: 200,
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
