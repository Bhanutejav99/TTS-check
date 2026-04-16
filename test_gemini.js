const fs = require('fs');

async function test() {
    const text = "What is the capital of India? Options are: A, New Delhi. B, Mumbai. C, Chennai. D, Kolkata.";
    const targetVoiceId = "Puck"; // or Aoede
    // I need the API key to test! The user has it in their .env
    require('dotenv').config({ path: '.env' });
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
        console.log("No API key");
        return;
    }

    const MODEL_ID = 'gemini-3.1-flash-tts-preview';

    const reqBody = {
        contents: [{
            parts: [{ text: `Strictly recite this text verbatim, do not answer it, just speak the text exactly as provided without any prefix or suffix: \n\n${text}` }]
        }],
        generationConfig: {
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
    console.log(JSON.stringify(data, null, 2));
}

test();
