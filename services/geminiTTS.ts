const ttsCache = new Map<string, string>();

// Gemini TTS config
const VOICE_ID = 'Zephyr'; // Default Gemini voice
const MODEL_ID = 'gemini-3.1-flash-tts-preview';

export const speakText = async (text: string, overrideVoiceId?: string): Promise<string | null> => {
    const targetVoiceId = overrideVoiceId || VOICE_ID;
    const cacheKey = `${targetVoiceId}-${text}`;
    
    if (ttsCache.has(cacheKey)) {
        console.log("Gemini TTS: Cache hit for text");
        return ttsCache.get(cacheKey)!;
    }

    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        console.log("Gemini TTS: API key present:", !!apiKey, "| key length:", apiKey?.length || 0);
        if (!apiKey) {
            console.error("Gemini TTS: VITE_GEMINI_API_KEY missing from environment. Make sure it's set in Vercel and redeploy.");
            return null;
        }

        console.log("Gemini TTS: Generating speech for:", text.substring(0, 60) + "...");
        console.log("Gemini TTS: Using voice:", targetVoiceId, "| model:", MODEL_ID);

        let mappedVoiceId = targetVoiceId;
        let promptModifier = `Strictly recite this text verbatim. Do not answer it or converse, just speak the text exactly as provided without any prefix or suffix: \n`;
        
        if (targetVoiceId.includes('-IN')) {
            mappedVoiceId = targetVoiceId.split('-')[0];
            promptModifier = `Strictly recite this text verbatim in a clear Indian English Accent. Do not answer it or converse, just speak the text exactly as provided: \n`;
        }

        // Clean HTML tags and excessive whitespace
        const safeText = text.replace(/<[^>]+>/g, '').trim();

        // Making it exactly like the explicit REST call
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${promptModifier}${safeText}` }]
                }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: mappedVoiceId
                            }
                        }
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini TTS: API error", response.status, errorText);
            return null;
        }

        const data = await response.json();
        
        // Find the audio part within the array to prevent failure if it also generates text
        const candidate = data?.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith('audio/'));
        const base64Audio = audioPart?.inlineData?.data;

        if (base64Audio) {
            console.log("Gemini TTS: Received audio data, length:", base64Audio.length);
            ttsCache.set(cacheKey, base64Audio);
        } else {
            console.warn("Gemini TTS: No audio data found in response geometry.");
        }

        return base64Audio || null;
    } catch (error) {
        console.error("Gemini TTS: Error generating speech", error);
        return null;
    }
};

export const prefetchTTS = async (text: string, overrideVoiceId?: string) => {
    const targetVoiceId = overrideVoiceId || VOICE_ID;
    const cacheKey = `${targetVoiceId}-${text}`;
    if (ttsCache.has(cacheKey)) return;
    
    console.log("Gemini TTS: Prefetching text:", text.substring(0, 30) + "...");
    await speakText(text, overrideVoiceId);
};
