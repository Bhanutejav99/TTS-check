
// Gemini TTS config
const VOICE_ID = 'Zephyr'; // Default Gemini voice
const MODEL_ID = 'gemini-3.1-flash-tts-preview';

// Rate limit management — queue requests to stay under Paid Tier 1 limits
// Actual limits: 10 RPM, 100 RPD (Requests Per Day)
let lastRequestTime = 0;
const MIN_REQUEST_GAP_MS = 7000; // ~8.5 RPM max, stays safely under 10 RPM limit

const waitForSlot = async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_GAP_MS) {
        const waitMs = MIN_REQUEST_GAP_MS - elapsed;
        console.log(`Gemini TTS: Throttling — waiting ${waitMs}ms for rate limit slot`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    lastRequestTime = Date.now();
};

const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 2): Promise<Response> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        await waitForSlot();
        const response = await fetch(url, options);

        if (response.status === 429 && attempt < maxRetries) {
            // Exponential backoff: 8s, 16s — aggressive backoff to not waste RPD quota
            const backoffMs = Math.pow(2, attempt + 3) * 1000;
            console.warn(`Gemini TTS: 429 Rate Limited — retry ${attempt + 1}/${maxRetries} after ${backoffMs}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
        }

        return response;
    }

    // Should never reach here, but satisfy TypeScript
    throw new Error("RATE_LIMIT_EXCEEDED");
};

export const speakText = async (text: string, overrideVoiceId?: string): Promise<string | null> => {
    // Clean HTML tags and excessive whitespace to prevent duplicate cache misses
    const safeText = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!safeText) return null;

    const targetVoiceId = overrideVoiceId || VOICE_ID;

    try {
        console.log("Gemini TTS: Generating speech for:", text.substring(0, 60) + "...");
        console.log("Gemini TTS: Calling proxy /api/tts | model:", MODEL_ID);
        console.log("Gemini TTS: Using voice:", targetVoiceId);

        let mappedVoiceId = targetVoiceId;
        let promptModifier = `Strictly recite this text verbatim. Do not answer it or converse, just speak the text exactly as provided without any prefix or suffix: `;
        
        if (targetVoiceId.includes('-IN')) {
            mappedVoiceId = targetVoiceId.split('-')[0];
            promptModifier = `Strictly recite this text verbatim in a natural Indian English accent. Do not answer it, converse, or add any commentary. Just read the text exactly as provided: `;
        }

        // Text is already cleaned above as safeText

        const requestBody = JSON.stringify({
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
        });

        // Secure proxy call with automatic retry on 429
        const googleResponse = await fetchWithRetry(`/api/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: requestBody
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
};

export const prefetchTTS = async (text: string, overrideVoiceId?: string) => {
    // Prefetch disabled since caching is removed
};
