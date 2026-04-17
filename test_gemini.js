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

    // Updated to match production format: systemInstruction + clean contents
    const reqBody = {
        systemInstruction: {
            parts: [{ text: 'Strictly recite this text verbatim. Do not answer it or converse, just speak the text exactly as provided without any prefix or suffix: ' }]
        },
        contents: [{
            parts: [{ text: text }]
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
