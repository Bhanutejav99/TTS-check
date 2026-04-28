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
    const { fileData, mimeType } = body;

    if (!fileData || !mimeType) {
      return new Response(JSON.stringify({ error: 'Invalid payload. Expected { fileData, mimeType }' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clean up base64 string if it contains the data URI prefix
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;

    const systemPrompt = `You are an expert educational content extractor.
Your task is to carefully analyze the provided document and extract ALL numbered multiple-choice questions.

CRITICAL INSTRUCTIONS:
1. ONLY extract questions that are written in English. Ignore any questions, paragraphs, or instructions in any other language (e.g. Hindi, Telugu, etc.).
2. Frame the question text and answer options carefully, cleanly, and without typos.
3. For each question, identify the 4 options and the correct answer. If the correct answer is not explicitly marked in the document, you must intelligently guess the most accurate answer or default to "A" if uncertain.
4. Your output MUST be ONLY a valid JSON array of objects.

Each object in the array MUST have EXACTLY the following structure:
{
  "id": <number>,
  "question": "<string>",
  "optionA": "<string>",
  "optionB": "<string>",
  "optionC": "<string>",
  "optionD": "<string>",
  "correctAnswer": "<one of 'A', 'B', 'C', 'D'>"
}

Return ONLY the raw JSON array. Do not include markdown blocks like \`\`\`json.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { 
            text: "Extract the English multiple-choice questions from this document following the system instructions." 
          }
        ]
      }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.1, // Low temperature for high accuracy
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
    
    // Parse the result to ensure it is valid JSON
    let extractedQuestions = [];
    try {
      extractedQuestions = JSON.parse(resultText);
    } catch (parseError) {
      // Sometimes Gemini wraps in ```json even when told not to or when responseMimeType is set
      resultText = resultText.replace(/^\`\`\`json/m, '').replace(/\`\`\`$/m, '').trim();
      extractedQuestions = JSON.parse(resultText);
    }

    if (!Array.isArray(extractedQuestions)) {
      throw new Error("Gemini returned invalid format, expected an array.");
    }

    return new Response(JSON.stringify({ questions: extractedQuestions }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error("Document Extraction Error:", error);
    return new Response(JSON.stringify({ error: 'Failed to extract questions from document', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
