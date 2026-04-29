const fs = require('fs');

async function test() {
    const text = "What is the capital of India? Options are: A, New Delhi. B, Mumbai. C, Chennai. D, Kolkata.";
    const targetVoiceId = "Puck"; // or Aoede, Zephyr, Charon, Kore, Fenrir
    // I need the API key to test! The user has it in their .env
    require('dotenv').config({ path: '.env' });
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
        console.log("No API key");
        return;
    }

    const MODEL_ID = 'gemini-3.1-flash-tts-preview';

    // Updated to match production format: context-aware system instruction
    const wordCount = text.trim().split(/\s+/).length;
    const estimatedSeconds = Math.max(3, Math.ceil(wordCount / 2.5));
    
    const systemPrompt = `You are a professional quiz show host reading questions on a live broadcast. Your job is to read the EXACT text provided — every single word, in order, with nothing added or removed.

SPEECH RATE & TIMING (CRITICAL):
- This text has approximately ${wordCount} words. Read it in roughly ${estimatedSeconds} seconds.
- Speak at a steady pace of about 150 words per minute (2.5 words per second). Not too fast, not too slow.
- Do NOT rush. Do NOT drag. Maintain a consistent, measured pace throughout.

STRUCTURE & PAUSES:
- The text contains a QUESTION followed by OPTIONS (A, B, C, D).
- Read the QUESTION clearly. After the question ends (before "Options are"), take a brief pause (about 0.5 seconds).
- When reading options: pause very briefly (about 0.3 seconds) between each option letter and its text.
- Read each option at the SAME steady pace as the question — do not speed up or slow down for options.
- Do NOT skip any option. Read ALL four options A, B, C, D completely before stopping.
- After the last option (D), stop cleanly. Do not add any words after it.

ABSOLUTE RULES:
1. Read EVERY word exactly as written. Do not skip, add, rephrase, summarize, or reorder any words.
2. Do NOT answer the question, provide commentary, hints, or any extra words.
3. Do NOT add prefixes ("Sure", "Here's the question", "Okay") or suffixes ("and that's it", "good luck").
4. You are a recitation engine — reproduce the script with perfect fidelity.`;

    const reqBody = {
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [{
            parts: [{ text: `"""${text}"""` }]
        }],
        generationConfig: {
            temperature: 0.0,
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: targetVoiceId
                    }
                }
            }
        }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
    });

    if (!response.ok) {
        console.log("Error:", response.status, await response.text());
        return;
    }

    const data = await response.json();
    
    // Check for audio data
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let hasAudio = false;
    for (const p of parts) {
        const inlineData = p.inlineData || p.inline_data;
        if (inlineData && inlineData.mimeType && inlineData.mimeType.startsWith('audio/')) {
            console.log("✅ Audio received! MIME:", inlineData.mimeType, "| Length:", inlineData.data.length);
            hasAudio = true;
            break;
        }
    }
    
    if (!hasAudio) {
        console.log("❌ No audio data found in response");
        console.log(JSON.stringify(data, null, 2));
    }
}

test();
