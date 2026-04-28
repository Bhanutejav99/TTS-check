/**
 * A dictionary of phonetic replacements for TTS engines (like Google Chirp)
 * that incorrectly apply native nasalized vowels or incorrect phonetics to English text.
 * 
 * For example, "Humayun" is natively pronounced with a nasal 'n' (Humayoo), 
 * dropping the hard consonant. We trick the AI by sending "Huma-yunn".
 */

const PHONETIC_MAP: Record<string, string> = {
    // --- MUGHAL & ISLAMIC HISTORY ---
    // Nasalized 'n' fixes
    "Humayun": "Huma-yunn",
    "Jahan": "Ja-hann",
    "Shahjahan": "Shah Ja-hann",
    "Jahangir": "Ja-haan-geer",
    
    // Deen / Uddin fixes
    "Qutbuddin": "Kutub-ud-deen",
    "Alauddin": "Ala-ud-deen",
    "Jalaluddin": "Jalal-ud-deen",
    "Ghiyasuddin": "Ghiyas-ud-deen",
    "Siraj-ud-Daulah": "Siraj ud-Dowla",
    "Shuja-ud-Daulah": "Shooja ud-Dowla",

    // Rulers & Dynasties
    "Aibak": "Eye-buck",
    "Iltutmish": "Il-toot-mish",
    "Babar": "Baa-bur",
    "Babur": "Baa-bur",
    "Akbar": "Uk-bur",
    "Aurangzeb": "Orang-zabe",
    "Ghazni": "Ghaz-nee",
    "Ghori": "Gho-ree",
    "Mahmud": "Muh-mood",
    "Qasim": "Kaa-sim",
    "Khilji": "Kill-jee",
    "Tughlaq": "Toogh-luck",
    "Lodi": "Lo-dee",
    "Suri": "Soo-ree",
    "Sher Shah": "Share Shah",
    "Mughal": "Moo-gull",
    "Mughals": "Moo-gulls",
    "Tipu": "Tee-poo",
    "Nawab": "Na-waab",
    "Bahmani": "Bah-ma-nee",

    // --- ANCIENT INDIA ---
    // Empires & Kings
    "Maurya": "Mow-rya",
    "Chandragupta": "Chun-dra-goop-ta",
    "Samudragupta": "Sa-mu-dra-goop-ta",
    "Ashoka": "A-sho-ka",
    "Harsha": "Har-sha",
    "Vardhana": "Var-dha-na",
    "Chola": "Cho-la",
    "Chera": "Che-ra",
    "Pandya": "Paan-dya",
    "Pallava": "Pul-la-va",
    "Chalukya": "Cha-look-ya",
    "Rashtrakuta": "Raash-tra-koo-ta",
    "Chanakya": "Cha-nuk-ya",
    "Aryabhata": "Aar-ya-bha-ta",
    "Kalidasa": "Kaa-li-daa-sa",

    // Places
    "Harappa": "Ha-rup-pa",
    "Mohenjo-Daro": "Mo-hen-jo-daa-ro",
    "Pataliputra": "Pa-ta-li-poo-tra",
    "Magadha": "Mu-ga-dha",

    // Religious / Cultural Terms
    "Vedas": "Vay-dus",
    "Upanishads": "Oo-pan-ish-uds",
    "Brahmin": "Braah-min",
    "Brahman": "Braah-mun",
    "Kshatriya": "Ksha-tree-ya",
    "Vaishya": "Vy-shya",
    "Shudra": "Shoo-dra",
    "Mahavira": "Ma-haa-vee-ra",
    "Gautama": "Gow-ta-ma",
    "Buddha": "Bood-dha",

    // --- MEDIEVAL & REGIONAL EMPIRES ---
    "Rajput": "Raaj-poot",
    "Rajputs": "Raaj-poots",
    "Prithviraj": "Prith-vee-raaj",
    "Chauhan": "Chow-haan",
    "Maratha": "Ma-raa-tha",
    "Shivaji": "Shi-vaa-jee",
    "Peshwa": "Pay-shwa",
    "Vijayanagara": "Vi-jay-na-ga-ra",
    "Krishnadevaraya": "Krish-na-day-va-raa-ya",
    "Awadh": "A-wudh",
    "Oudh": "A-wudh",
    "Bhakti": "Bhuk-tee",
    "Sufi": "Soo-fee",
    "Khalsa": "Khaal-sa",

    // --- MODERN HISTORY (FREEDOM STRUGGLE) ---
    // Leaders
    "Gandhi": "Gaan-dhee",
    "Nehru": "Nay-roo",
    "Subhash": "Soo-bhaash",
    "Bhagat": "Bha-gut",
    "Azad": "Aa-zaad",
    "Savarkar": "Saa-var-kar",
    "Ambedkar": "Um-bade-kar",
    "Patel": "Pa-tale",
    "Tilak": "Ti-luck",
    "Gokhale": "Go-kha-lay",
    "Naoroji": "Now-ro-jee",
    
    // Movements & Terms
    "Satyagraha": "Sut-yaa-gra-ha",
    "Swadeshi": "Swa-day-shee",
    "Swaraj": "Swa-raaj",
    "Zamindar": "Za-meen-daar",
    "Jallianwala": "Jal-li-yan-waa-la",

    // --- COMMON SUFFIXES ---
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
