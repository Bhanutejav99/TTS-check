const ttsCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

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

    throw new Error("RATE_LIMIT_EXCEEDED");
};

export const speakText = async (text: string, overrideVoiceId?: string): Promise<string | null> => {
    // Clean HTML tags and excessive whitespace to prevent duplicate cache misses
    const safeText = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!safeText) return null;

    const targetVoiceId = overrideVoiceId || VOICE_ID;
    const cacheKey = `gemini-${targetVoiceId}-${safeText}`;

    if (ttsCache.has(cacheKey)) {
        return ttsCache.get(cacheKey)!;
    }

    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey)!;
    }

    const requestPromise = (async () => {
        try {
            console.log("Gemini TTS: Generating speech for:", text.substring(0, 60) + "...");
            console.log("Gemini TTS: Calling proxy /api/tts | model:", MODEL_ID);
            console.log("Gemini TTS: Using voice:", targetVoiceId);

            let mappedVoiceId = targetVoiceId;

            // ── Build a context-aware system instruction ──
            // Detect the type of content being spoken for tailored pacing rules
            const isQuestionWithOptions = safeText.includes('Options are:');
            const isAnswerReveal = safeText.toLowerCase().startsWith('answer is option');
            const isIntroOutro = safeText.toLowerCase().startsWith('welcome to') || safeText.toLowerCase().startsWith('thanks for');
            
            const accentDirective = targetVoiceId.includes('-IN')
                ? `Speak with a natural Indian English accent throughout. `
                : ``;

            if (targetVoiceId.includes('-IN')) {
                mappedVoiceId = targetVoiceId.split('-')[0];
            }

            // Estimate word count to give model a time anchor
            const wordCount = safeText.trim().split(/\s+/).length;
            // Target: ~2.0 words/second (120 wpm) — slower, measured quiz-host pace for Gemini
            const estimatedSeconds = Math.max(3, Math.ceil(wordCount / 2.0));

            let promptModifier: string;

            if (isQuestionWithOptions) {
                promptModifier = `You are a professional quiz show host reading questions on a live broadcast. ${accentDirective}Your job is to read the EXACT text provided — every single word, in order, with nothing added or removed.

SPEECH RATE & TIMING (CRITICAL):
- This text has approximately ${wordCount} words. Read it in roughly ${estimatedSeconds} seconds.
- Speak at a steady, measured pace of about 120 words per minute (2 words per second). This is SLOWER than normal conversation — take your time.
- Do NOT rush. Do NOT drag. Maintain a consistent, measured pace throughout.

STRUCTURE & PAUSES:
- The text contains a QUESTION followed by OPTIONS (A, B, C, D).
- Read the QUESTION clearly. After the question ends (before "Options are"), take a brief pause (about 0.5 seconds).
- When reading options: pause briefly (about 0.4 seconds) between each option letter and its text.
- Read each option at the SAME steady pace as the question — do not speed up or slow down for options.
- Do NOT skip any option. Read ALL four options A, B, C, D completely before stopping.
- After the last option (D), stop cleanly. Do not add any words after it.

ABSOLUTE RULES:
1. Read EVERY word exactly as written. Do not skip, add, rephrase, summarize, or reorder any words.
2. Do NOT answer the question, provide commentary, hints, or any extra words.
3. Do NOT add prefixes ("Sure", "Here's the question", "Okay") or suffixes ("and that's it", "good luck").
4. You are a recitation engine — reproduce the script with perfect fidelity.`;
            } else if (isAnswerReveal) {
                promptModifier = `You are a professional quiz show host revealing the correct answer on a live broadcast. ${accentDirective}Read the EXACT text provided — nothing added, nothing removed.

SPEECH RATE & TIMING:
- This text has approximately ${wordCount} words. Read it in roughly ${estimatedSeconds} seconds.
- Speak at a confident, clear pace of about 120 words per minute. Take your time announcing the answer.
- Read with a slightly confident, revealing tone — you are announcing the correct answer.
- Do NOT rush. Let each word land clearly.

ABSOLUTE RULES:
1. Read EVERY word exactly as written. Do not add, skip, or change any words.
2. Do NOT add commentary like "correct!", "that's right!", or any celebration.
3. Do NOT repeat the answer or add any extra words before or after.
4. Just read the provided text and stop.`;
            } else if (isIntroOutro) {
                promptModifier = `You are a warm, professional quiz show host. ${accentDirective}Read the EXACT text provided — nothing added, nothing removed.

SPEECH RATE & TIMING:
- Speak at a warm, inviting pace of about 110 words per minute — slower and more welcoming than normal.
- Let the words breathe. This is the opening or closing of a show.

ABSOLUTE RULES:
1. Read EVERY word exactly as written. Do not add greetings, commentary, or filler.
2. Just read the provided text and stop.`;
            } else {
                // Generic fallback for any other text
                promptModifier = `You are a text-to-speech recitation engine. ${accentDirective}Your ONLY function is to read aloud the exact text provided.

SPEECH RATE: Speak at a steady, measured pace of about 120 words per minute (2 words per second). This text has approximately ${wordCount} words — read it in roughly ${estimatedSeconds} seconds.

ABSOLUTE RULES:
1. Read EVERY word exactly as written. Do not skip, add, rephrase, or reorder any words.
2. Do NOT answer questions, provide commentary, greetings, or any extra words whatsoever.
3. Do NOT add prefixes or suffixes. Just read the text and stop.`;
            }

            const requestBody = JSON.stringify({
                systemInstruction: {
                    parts: [{ text: promptModifier }]
                },
                contents: [{
                    parts: [{ text: `"""${safeText}"""` }]
                }],
                generationConfig: {
                    temperature: 0.0,
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
    try {
        return await requestPromise;
    } finally {
        pendingRequests.delete(cacheKey);
    }
};

export const prefetchTTS = async (text: string, overrideVoiceId?: string) => {
    const targetVoiceId = overrideVoiceId || VOICE_ID;
    const cacheKey = `gemini-${targetVoiceId}-${text}`;
    if (ttsCache.has(cacheKey)) return;
    
    console.log("Gemini TTS: Prefetching text:", text.substring(0, 30) + "...");
    await speakText(text, overrideVoiceId);
};
