
const ttsCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

// Google Cloud TTS config - Chirp HD is the most natural generative generation
const DEFAULT_VOICE = 'en-IN-Chirp-HD-D';
const DEFAULT_LANG = 'en-IN';

export const speakText = async (text: string, voiceName?: string): Promise<string | null> => {
    const targetVoice = voiceName || DEFAULT_VOICE;
    const cacheKey = `${targetVoice}-${text}`;
    
    if (ttsCache.has(cacheKey)) {
        return ttsCache.get(cacheKey)!;
    }

    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey)!;
    }

    const requestPromise = (async () => {
        try {
            console.log("Google Cloud TTS: Generating speech for:", text.substring(0, 60) + "...");
            
            const response = await fetch('/api/google-tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text.replace(/<[^>]+>/g, '').trim(),
                    voiceName: targetVoice,
                    languageCode: targetVoice.split('-').slice(0, 2).join('-') // e.g. en-IN
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Google Cloud TTS: Proxy/API error", response.status, errorData);
                return null;
            }

            const data = await response.json();
            const base64Audio = data.audioContent;

            if (base64Audio) {
                console.log("Google Cloud TTS: Received audio data, length:", base64Audio.length);
                ttsCache.set(cacheKey, base64Audio);
                return base64Audio;
            }

            return null;
        } catch (error) {
            console.error("Google Cloud TTS: Error generating speech", error);
            return null;
        }
    })();
    
    pendingRequests.set(cacheKey, requestPromise);
    try {
        return await requestPromise;
    } finally {
        pendingRequests.delete(cacheKey);
    }
};

export const prefetchTTS = async (text: string, voiceName?: string) => {
    const targetVoice = voiceName || DEFAULT_VOICE;
    const cacheKey = `${targetVoice}-${text}`;
    if (ttsCache.has(cacheKey)) return;
    
    console.log("Google Cloud TTS: Prefetching text:", text.substring(0, 30) + "...");
    await speakText(text, targetVoice);
};
