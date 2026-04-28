// Google Cloud TTS config - Chirp HD is the most natural generative generation
const DEFAULT_VOICE = 'en-IN-Chirp-HD-D';
const DEFAULT_LANG = 'en-IN';

import { wrapIndianNamesInSSML } from '../utils/indianNameSSML.ts';
import { applyPhoneticFixes } from '../utils/phoneticFixes.ts';

export const speakText = async (text: string, voiceName?: string): Promise<string | null> => {
    // Strip HTML and normalize whitespace for consistent cache keys
    const cleanText = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return null;

    const targetVoice = voiceName || DEFAULT_VOICE;

    try {
        console.log("Google Cloud TTS: Generating speech for:", cleanText.substring(0, 60) + "...");

        // Chirp / Chirp-HD / Chirp3-HD voices do NOT support SSML <lang> tags.
        // Only use SSML for Neural2 / WaveNet / Standard voices.
        const supportsSSML = /Neural2|WaveNet|Standard/i.test(targetVoice);

        const requestBody: Record<string, any> = {
            voiceName: targetVoice,
            languageCode: targetVoice.split('-').slice(0, 2).join('-') // e.g. en-IN
        };

        // Apply phonetic English fixes so Google doesn't use Hindi nasal vowels
        const phoneticText = applyPhoneticFixes(cleanText);

        if (supportsSSML) {
            requestBody.ssml = wrapIndianNamesInSSML(phoneticText);
        } else {
            requestBody.text = phoneticText;
        }

        const response = await fetch('/api/google-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
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
            return base64Audio;
        }

        return null;
    } catch (error) {
        console.error("Google Cloud TTS: Error generating speech", error);
        return null;
    }
};

export const prefetchTTS = async (text: string, voiceName?: string) => {
    // Prefetch disabled since caching is removed
};

