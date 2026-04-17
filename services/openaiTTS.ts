
const ttsCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

// Predefined Indian accent instruction for MCQ quiz reading
const INDIAN_ACCENT_INSTRUCTION = `Speak in a clear, warm, and engaging Indian English accent. 
Your delivery should be professional, like a knowledgeable Indian teacher reading out a quiz question. 
Speak at a moderate pace. Articulate each word clearly. 
Strictly recite the text verbatim — do not add any commentary or conversation.`;

// Voice options for gpt-4o-mini-tts that work best with Indian accent instruction
export const OPENAI_VOICES = [
  { id: 'echo-in', label: 'Echo (Indian Male)', voice: 'echo', instructions: INDIAN_ACCENT_INSTRUCTION },
  { id: 'onyx-in', label: 'Onyx (Indian Male, Deep)', voice: 'onyx', instructions: INDIAN_ACCENT_INSTRUCTION },
  { id: 'shimmer-in', label: 'Shimmer (Indian Female)', voice: 'shimmer', instructions: INDIAN_ACCENT_INSTRUCTION },
  { id: 'nova-in', label: 'Nova (Indian Female, Warm)', voice: 'nova', instructions: INDIAN_ACCENT_INSTRUCTION },
  { id: 'alloy-in', label: 'Alloy (Indian Neutral)', voice: 'alloy', instructions: INDIAN_ACCENT_INSTRUCTION },
  { id: 'fable-in', label: 'Fable (Indian Narrator)', voice: 'fable', instructions: INDIAN_ACCENT_INSTRUCTION },
];

export const speakText = async (text: string, voicePresetId?: string): Promise<string | null> => {
    // Find the voice preset (default to echo-in if not found)
    const preset = OPENAI_VOICES.find(v => v.id === voicePresetId) || OPENAI_VOICES[0];
    const cacheKey = `openai-${preset.id}-${text}`;

    if (ttsCache.has(cacheKey)) {
        console.log("OpenAI TTS: Cache hit");
        return ttsCache.get(cacheKey)!;
    }

    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey)!;
    }

    const requestPromise = (async () => {
        try {
            const safeText = text.replace(/<[^>]+>/g, '').trim();
            if (!safeText) return null;

            console.log("OpenAI TTS: Generating speech for:", safeText.substring(0, 60) + "...");
            console.log("OpenAI TTS: Using preset:", preset.label);

            const response = await fetch('/api/openai-tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: safeText,
                    voice: preset.voice,
                    instructions: preset.instructions,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("OpenAI TTS: API error", response.status, errorData);

                if (response.status === 401 || response.status === 403) {
                    throw new Error("AUTH_ERROR");
                } else if (response.status === 429) {
                    throw new Error("RATE_LIMIT_EXCEEDED");
                }
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
            console.error("OpenAI TTS: Error generating speech", error);
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

export const prefetchTTS = async (text: string, voicePresetId?: string) => {
    const preset = OPENAI_VOICES.find(v => v.id === voicePresetId) || OPENAI_VOICES[0];
    const cacheKey = `openai-${preset.id}-${text}`;
    if (ttsCache.has(cacheKey)) return;

    console.log("OpenAI TTS: Prefetching...");
    await speakText(text, voicePresetId);
};
