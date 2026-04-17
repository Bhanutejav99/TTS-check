
const ttsCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

// ─── Fixed Config ─────────────────────────────────────────────
// Single stable voice — do NOT change per request to maintain consistency
const FIXED_VOICE = 'onyx';

const MCQ_INSTRUCTION = `You are a calm, professional Indian English teacher reading a multiple choice question to students in a classroom.
Speak in a clear, steady Indian English accent throughout. Do not switch accents.
Maintain a moderate, even pace. Add a natural pause after the question and after each option.
Clearly emphasize the option letter (for example: "Option A", "Option B") before reading each choice.
Strictly recite the text verbatim. Do not add any commentary, greetings, or conversation.`;

// ─── Number Spelling ──────────────────────────────────────────
const NUMBER_WORDS: Record<string, string> = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
    '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
    '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
    '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
    '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy',
    '80': 'eighty', '90': 'ninety', '100': 'hundred'
};

const spellOutNumbers = (text: string): string => {
    // Replace standalone small integers (0-100) with their word equivalents
    return text.replace(/\b(\d+)\b/g, (match) => {
        if (NUMBER_WORDS[match]) return NUMBER_WORDS[match];
        const n = parseInt(match, 10);
        // Spell out tens (21-99)
        if (n > 20 && n < 100) {
            const tens = Math.floor(n / 10) * 10;
            const ones = n % 10;
            const tensWord = NUMBER_WORDS[String(tens)] || String(tens);
            const onesWord = ones > 0 ? `-${NUMBER_WORDS[String(ones)] || String(ones)}` : '';
            return `${tensWord}${onesWord}`;
        }
        // Leave larger numbers (years, IDs) as-is
        return match;
    });
};

// ─── MCQ Text Formatter ───────────────────────────────────────
/**
 * Detects if text contains MCQ options and formats it for optimal TTS delivery:
 * - Adds structured labels: "Question: ...", "Options: Option A. ..."
 * - Adds "..." pause markers after question and each option
 * - Spells out small numbers for clarity
 *
 * If text is not an MCQ (e.g. standalone option or intro text), formats it cleanly.
 */
const formatForMCQ = (rawText: string): string => {
    // Strip HTML tags
    const clean = rawText.replace(/<[^>]+>/g, '').trim();

    // Detect MCQ options pattern: lines or segments starting with A. B. C. D.
    const optionRegex = /\b([A-D])[.)]\s*/gi;
    const hasOptions = optionRegex.test(clean);

    if (!hasOptions) {
        // Plain text (e.g. "Testing the AI Auto-Reader") — just spell numbers and add clarity
        return spellOutNumbers(clean);
    }

    // Split into question part and options part
    // Find where the first option starts (A. or A))
    const splitMatch = clean.match(/^(.*?)\s*\b[A-D][.)]/s);
    const questionPart = splitMatch ? splitMatch[1].trim() : clean;

    // Extract individual options using regex
    const optionMatches = [...clean.matchAll(/\b([A-D])[.)]\s*([^A-D\n]*?)(?=\s*\b[A-D][.)]|$)/gi)];

    const formattedQuestion = spellOutNumbers(questionPart) || 'Question';
    
    const formattedOptions = optionMatches.map(match => {
        const letter = match[1].toUpperCase();
        const content = spellOutNumbers(match[2].trim());
        return `Option ${letter}. … ${content}`;
    }).join(' … ');

    if (formattedOptions) {
        return `Question: ${formattedQuestion} … Options: ${formattedOptions} …`;
    }

    // Fallback if option extraction failed
    return spellOutNumbers(clean);
};

// ─── Public API ───────────────────────────────────────────────
export const speakText = async (text: string, _voicePresetId?: string): Promise<string | null> => {
    // Always use fixed voice — ignore voicePresetId to ensure consistency
    const formattedText = formatForMCQ(text);
    const cacheKey = `openai-mcq-${FIXED_VOICE}-${formattedText}`;

    if (ttsCache.has(cacheKey)) {
        console.log("OpenAI TTS: Cache hit");
        return ttsCache.get(cacheKey)!;
    }

    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey)!;
    }

    const requestPromise = (async () => {
        try {
            if (!formattedText) return null;

            console.log("OpenAI TTS: Sending formatted MCQ to gpt-4o-mini-tts:");
            console.log("OpenAI TTS:", formattedText.substring(0, 120));

            const response = await fetch('/api/openai-tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: formattedText,
                    voice: FIXED_VOICE,
                    instructions: MCQ_INSTRUCTION,
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
    const formatted = formatForMCQ(text);
    const cacheKey = `openai-mcq-${FIXED_VOICE}-${formatted}`;
    if (ttsCache.has(cacheKey)) return;
    await speakText(text);
};
