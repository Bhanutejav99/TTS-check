
const ttsCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

// ─── Fixed Config ─────────────────────────────────────────────
// Single stable voice — alloy responds best to accent instructions
const FIXED_VOICE = 'alloy';

// Tuned instruction: strong Indian accent, brisk pace, no extra pauses
const MCQ_INSTRUCTION = `You are an Indian English speaker from India. Your accent is unmistakably Indian — the kind heard on Indian news channels or in Indian university lectures. Think of how a confident Indian professor speaks English.

Key pronunciation traits to follow strictly:
- Use Indian English rhythm and intonation patterns throughout
- Pronounce "th" sounds with a dental stop (like an Indian speaker would)  
- Roll your R's slightly
- Use the characteristic Indian English rising-falling intonation pattern

Pace: Speak at a brisk, energetic pace — like a quiz show host keeping the energy up. Do NOT speak slowly. Do NOT add long pauses between sentences.

Content rules: Read the text exactly as given. Do not add greetings, commentary, or conversation. Just read it out.`;

// ─── Minimal Text Cleanup ─────────────────────────────────────
// The quiz already formats text correctly — we just clean HTML and normalize
const cleanText = (raw: string): string => {
    return raw
        .replace(/<[^>]+>/g, '')  // Strip HTML
        .replace(/\s+/g, ' ')     // Collapse whitespace
        .trim();
};

// ─── Public API ───────────────────────────────────────────────
export const speakText = async (text: string, _voicePresetId?: string): Promise<string | null> => {
    const cleaned = cleanText(text);
    if (!cleaned) return null;

    const cacheKey = `openai-${FIXED_VOICE}-${cleaned}`;

    if (ttsCache.has(cacheKey)) {
        console.log("OpenAI TTS: Cache hit");
        return ttsCache.get(cacheKey)!;
    }

    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey)!;
    }

    const requestPromise = (async () => {
        try {
            console.log("OpenAI TTS: Generating for:", cleaned.substring(0, 80));

            const response = await fetch('/api/openai-tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: cleaned,
                    voice: FIXED_VOICE,
                    instructions: MCQ_INSTRUCTION,
                    speed: 1.15,  // Slightly faster than default for quiz energy
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("OpenAI TTS: API error", response.status, errorData);
                if (response.status === 401 || response.status === 403) throw new Error("AUTH_ERROR");
                if (response.status === 429) throw new Error("RATE_LIMIT_EXCEEDED");
                return null;
            }

            const data = await response.json();
            const base64Audio = data.audioContent;

            if (base64Audio) {
                console.log("OpenAI TTS: Received audio, length:", base64Audio.length);
                ttsCache.set(cacheKey, base64Audio);
                return base64Audio;
            }

            console.warn("OpenAI TTS: No audio content in response");
            return null;
        } catch (error: any) {
            console.error("OpenAI TTS: Error", error);
            if (error.message === "AUTH_ERROR" || error.message === "RATE_LIMIT_EXCEEDED") throw error;
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

export const prefetchTTS = async (text: string, _voicePresetId?: string) => {
    const cleaned = cleanText(text);
    const cacheKey = `openai-${FIXED_VOICE}-${cleaned}`;
    if (ttsCache.has(cacheKey)) return;
    await speakText(text);
};
