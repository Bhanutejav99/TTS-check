/**
 * A dictionary of phonetic replacements for TTS engines (like Google Chirp)
 * that incorrectly apply native nasalized vowels or incorrect phonetics to English text.
 * 
 * For example, "Humayun" is natively pronounced with a nasal 'n' (Humayoo), 
 * dropping the hard consonant. We trick the AI by sending "Huma-yunn".
 */

const PHONETIC_MAP: Record<string, string> = {
    // Nasalized 'n' fixes (Mughal/Islamic names)
    "Humayun": "Huma-yunn",
    "Jahan": "Ja-hann",
    "Shahjahan": "Shah Ja-hann",
    
    // Deen / Uddin fixes
    "Qutbuddin": "Kutub-ud-deen",
    "Alauddin": "Ala-ud-deen",
    "Jalaluddin": "Jalal-ud-deen",
    "Ghiyasuddin": "Ghiyas-ud-deen",
    "Siraj-ud-Daulah": "Siraj ud-Dowla",
    "Shuja-ud-Daulah": "Shooja ud-Dowla",

    // Consonant / Vowel corrections
    "Aibak": "Eye-buck",
    "Iltutmish": "Il-toot-mish",
    "Babar": "Baa-bur",
    "Babur": "Baa-bur",
    "Ghazni": "Ghaz-nee",
    "Ghori": "Gho-ree",
    "Khilji": "Kill-jee",
    "Tughlaq": "Toogh-luck",
    "Lodi": "Lo-dee",
    "Mughal": "Moo-gull",
    "Mughals": "Moo-gulls",
    "Aurangzeb": "Orang-zabe",
    "Tipu": "Tee-poo",
    "Rajput": "Raaj-poot",
    "Rajputs": "Raaj-poots",
    "Maratha": "Ma-raa-tha",
    "Awadh": "A-wudh",
    "Oudh": "A-wudh",
    "Nawab": "Na-waab",

    // Ancient India fixes
    "Maurya": "Mow-rya",
    "Ashoka": "A-sho-ka",
    "Chanakya": "Cha-nuk-ya",
    "Vedas": "Vay-dus",
    "Upanishads": "Oo-pan-ish-uds",
    "Brahmin": "Braah-min",
    "Brahman": "Braah-mun",
    "Kshatriya": "Ksha-tree-ya",
    "Vaishya": "Vy-shya",
    "Shudra": "Shoo-dra",

    // Common suffixes
    "pur": "poor", // e.g. Kanpur -> Kan-poor
    "abad": "a-baad" // e.g. Allahabad -> Allah-a-baad
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
