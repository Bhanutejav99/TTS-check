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

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_GENERATIVE_AI_API_KEY not configured' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const questions = body.questions;

    if (!questions || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: 'Invalid payload. Expected { questions: [...] }' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `You are an expert Indian phonetic linguist. 
Review the following JSON array of quiz questions. 
Your task is to identify any complex Indian historical names or cultural terms that a standard English Text-to-Speech engine would mispronounce or apply incorrect nasal vowels to (e.g., Humayun, Alauddin, Ashoka, Rajput, Aurangzeb).

For each question object, if a phonetic fix is needed in the question or any option, append the following fields to that object with an anglicized phonetic spelling (e.g., Humayun -> Humayunn, Alauddin -> Alauddeen):
- audioQuestion
- audioOptionA
- audioOptionB
- audioOptionC
- audioOptionD

Do NOT change or remove the original 'question', 'optionA', etc. fields. If no phonetic fix is needed for a specific field, do not add the audio equivalent.

Return the EXACT SAME JSON array structure, just with the new audio fields added where necessary. Return ONLY the raw JSON array.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [{
        parts: [{ text: JSON.stringify(questions, null, 2) }]
      }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.1, // Low temp for structured adherence
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(`Gemini API error: ${JSON.stringify(errData)}`);
    }

    const data = await response.json();
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Parse it back to ensure it's valid JSON before sending to client
    const optimizedQuestions = JSON.parse(resultText);

    return new Response(JSON.stringify({ questions: optimizedQuestions }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error("Phonetic Optimization Error:", error);
    return new Response(JSON.stringify({ error: 'Failed to optimize phonetics', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
