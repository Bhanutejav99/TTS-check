/**
 * A dictionary of phonetic replacements for TTS engines (like Google Chirp)
 * that incorrectly apply native nasalized vowels or incorrect phonetics to English text.
 * 
 * For example, "Humayun" is natively pronounced with a nasal 'n' (Humayoo), 
 * dropping the hard consonant. We trick the AI by sending "Huma-yunn".
 */

const PHONETIC_MAP: Record<string, string> = {
    // Nasalized 'n' fixes (Mughal/Islamic names)
    "Humayun": "Humayunn",
    "Jahan": "Jahann",
    "Shahjahan": "Shahjahann",
    "Jahangir": "Jahangeer",
    
    // Deen / Uddin fixes
    "Qutbuddin": "Kutubuddeen",
    "Alauddin": "Alauddeen",
    "Jalaluddin": "Jalaluddeen",
    "Ghiyasuddin": "Ghiyasuddeen",

    // Consonant / Vowel corrections
    "Aibak": "Eyebuck",
    "Iltutmish": "Iltootmish",
    "Babar": "Baabur",
    "Babur": "Baabur",
    "Ghazni": "Ghaznee",
    "Ghori": "Ghoree",
    "Khilji": "Killjee",
    "Tughlaq": "Tooghluck",
    "Lodi": "Lodee",
    "Mughal": "Moogull",
    "Mughals": "Moogulls",
    "Tipu": "Teepoo",
    "Rajput": "Raajpoot",
    "Rajputs": "Raajpoots"
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
