
const ttsCache = new Map<string, string>();

// ElevenLabs config — Niladri Mahapatra, Eleven v3, stability ~75%
const VOICE_ID = 'tQHPlZCaA3Oe1X8BqFIp'; // Niladri Mahapatra - Informative Teacher
const MODEL_ID = 'eleven_v3';
const STABILITY = 1.0;        // eleven_v3 only accepts: 0.0 (Creative), 0.5 (Natural), 1.0 (Robust)
const SIMILARITY_BOOST = 0.5;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const speakText = async (text: string): Promise<string | null> => {
    if (ttsCache.has(text)) {
        console.log("ElevenLabs TTS: Cache hit for text");
        return ttsCache.get(text)!;
    }

    try {
        const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        console.log("ElevenLabs TTS: API key present:", !!apiKey, "| key length:", apiKey?.length || 0);
        if (!apiKey) {
            console.error("ElevenLabs TTS: VITE_ELEVENLABS_API_KEY missing from environment. Make sure it's set in Vercel and redeploy.");
            return null;
        }

        console.log("ElevenLabs TTS: Generating speech for:", text.substring(0, 60) + "...");
        console.log("ElevenLabs TTS: Using voice:", VOICE_ID, "| model:", MODEL_ID);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model_id: MODEL_ID,
                voice_settings: {
                    stability: STABILITY,
                    similarity_boost: SIMILARITY_BOOST,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("ElevenLabs TTS: API error", response.status, errorText);
            return null;
        }

        const audioBuffer = await response.arrayBuffer();
        const base64Audio = arrayBufferToBase64(audioBuffer);

        if (base64Audio) {
            console.log("ElevenLabs TTS: Received audio data, length:", base64Audio.length);
            ttsCache.set(text, base64Audio);
        }

        return base64Audio || null;
    } catch (error) {
        console.error("ElevenLabs TTS: Error generating speech", error);
        return null;
    }
};

export const prefetchTTS = async (text: string) => {
    if (ttsCache.has(text)) return;
    console.log("ElevenLabs TTS: Prefetching text:", text.substring(0, 30) + "...");
    await speakText(text);
};
