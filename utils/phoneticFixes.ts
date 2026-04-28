/**
 * A dictionary of phonetic replacements for TTS engines (like Google Chirp)
 * that incorrectly apply native nasalized vowels or incorrect phonetics to English text.
 * 
 * For example, "Humayun" is natively pronounced with a nasal 'n' (Humayoo), 
 * dropping the hard consonant. We trick the AI by sending "Huma-yunn".
 */

const PHONETIC_MAP: Record<string, string> = {
    "Humayun": "Huma-yunn",
    "Jahan": "Ja-hann",
    "Shahjahan": "Shah Ja-hann",
    "Qutbuddin": "Kutub-ud-deen",
    "Aibak": "Eye-buck",
    "Iltutmish": "Il-toot-mish",
    "Babar": "Baa-bur",
    "Ghazni": "Ghaz-nee",
    "Ghori": "Gho-ree"
};

export const applyPhoneticFixes = (text: string): string => {
    let fixedText = text;
    for (const [original, replacement] of Object.entries(PHONETIC_MAP)) {
        // Use a case-insensitive regex with word boundaries to match the exact word
        const regex = new RegExp(`\\b${original}\\b`, 'gi');
        // We do a function replace to preserve original casing logic if needed, 
        // though replacing it directly with the phonetic spelling is fine since it's just audio.
        fixedText = fixedText.replace(regex, replacement);
    }
    return fixedText;
};
