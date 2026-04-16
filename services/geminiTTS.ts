const ttsCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

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

    if (pendingRequests.has(cacheKey)) {
        console.log("Gemini TTS: Awaiting existing pending request for text");
        return pendingRequests.get(cacheKey)!;
    }

    const requestPromise = (async () => {
        try {
        console.log("Gemini TTS: Generating speech for:", text.substring(0, 60) + "...");
        console.log("Gemini TTS: Calling proxy /api/tts | model:", MODEL_ID);

        console.log("Gemini TTS: Generating speech for:", text.substring(0, 60) + "...");
        console.log("Gemini TTS: Using voice:", targetVoiceId, "| model:", MODEL_ID);

        let mappedVoiceId = targetVoiceId;
        let promptModifier = `Strictly recite this text verbatim. Do not answer it or converse, just speak the text exactly as provided without any prefix or suffix: `;
        
        if (targetVoiceId.includes('-IN')) {
            mappedVoiceId = targetVoiceId.split('-')[0];
            promptModifier = `Strictly recite this text verbatim in a clear Indian English Accent. Do not answer it or converse, just speak the text exactly as provided: `;
        }

        // Clean HTML tags and excessive whitespace
        const safeText = text.replace(/<[^>]+>/g, '').trim();

        // Secure proxy call (hides API key from Network tab)
        const response = await fetch(`/api/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: promptModifier }]
                },
                contents: [{
                    parts: [{ text: safeText }]
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

        if (!googleResponse.ok) {
            const errorText = await googleResponse.text();
            let errorData;
            try { errorData = JSON.parse(errorText); } catch(e) { errorData = errorText; }
            
            console.error("Gemini TTS: Proxy/API error", googleResponse.status, errorData);
            
            if (googleResponse.status === 429) {
                throw new Error("RATE_LIMIT_EXCEEDED");
            } else if (googleResponse.status === 401 || googleResponse.status === 403) {
                throw new Error("AUTH_ERROR");
            }
            return null;
        }

        const data = await googleResponse.json();
        
        // Find the audio part within the array to prevent failure if it also generates text
        const candidate = data?.candidates?.[0];
        
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
            console.warn("Gemini TTS: Generation finished with non-STOP reason:", candidate.finishReason);
        }

        const parts = candidate?.content?.parts || [];
        
        let base64Audio = null;
        for (const p of parts) {
            const inlineData = p.inlineData || p.inline_data;
            if (inlineData && inlineData.mimeType && inlineData.mimeType.startsWith('audio/')) {
                base64Audio = inlineData.data;
                break;
            }
        }

        if (base64Audio) {
            console.log("Gemini TTS: Received audio data, length:", base64Audio.length);
            ttsCache.set(cacheKey, base64Audio);
        } else {
            console.warn("Gemini TTS: No audio data found in response geometry. Full response:", JSON.stringify(data));
        }

        return base64Audio || null;
        } catch (error: any) {
            console.error("Gemini TTS: Error generating speech", error);
            if (error.message === "RATE_LIMIT_EXCEEDED") throw error;
            if (error.message === "AUTH_ERROR") throw error;
            return null;
        }
    })();
    
    pendingRequests.set(cacheKey, requestPromise);
    const result = await requestPromise;
    pendingRequests.delete(cacheKey);
    return result;
};

export const prefetchTTS = async (text: string, overrideVoiceId?: string) => {
    const targetVoiceId = overrideVoiceId || VOICE_ID;
    const cacheKey = `${targetVoiceId}-${text}`;
    if (ttsCache.has(cacheKey)) return;
    
    console.log("Gemini TTS: Prefetching text:", text.substring(0, 30) + "...");
    await speakText(text, overrideVoiceId);
};
