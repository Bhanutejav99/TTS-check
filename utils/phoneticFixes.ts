/**
 * A dictionary of phonetic replacements for TTS engines (like Google Chirp)
 * that incorrectly apply native nasalized vowels or incorrect phonetics to English text.
 * 
 * For example, "Humayun" is natively pronounced with a nasal 'n' (Humayoo), 
 * dropping the hard consonant. We trick the AI by sending "Huma-yunn".
 */

const PHONETIC_MAP: Record<string, string> = {
    // --- ANCIENT INDIA (Vedic & Mahajanapadas) ---
    "Rigveda": "Rig-vayda",
    "Samaveda": "Sama-vayda",
    "Yajurveda": "Yajur-vayda",
    "Atharvaveda": "Atharva-vayda",
    "Upanishads": "Oo-pan-ish-uds",
    "Aranyakas": "Aa-run-yu-kus",
    "Brahmanas": "Braah-mu-nus",
    "Mahajanapadas": "Ma-haa-ja-na-pa-dus",
    "Magadha": "Mu-gu-dha",
    "Pataliputra": "Pa-ta-li-poo-tra",
    "Varanasi": "Va-raa-na-see",
    "Prayag": "Pra-yaag",
    "Kashi": "Kaa-shee",
    "Kosala": "Ko-sa-la",
    "Vatsa": "Vut-sa",
    "Avanti": "A-vun-tee",
    "Gandhara": "Gun-dhaa-ra",
    "Kamboja": "Kum-bo-ja",
    "Bimbisara": "Bim-bee-saa-ra",
    "Ajatashatru": "A-jaa-ta-sha-troo",
    "Sisunaga": "Shi-shoo-naa-ga",
    "Mahapadma": "Ma-haa-pud-ma",
    "Nanda": "Nun-da",

    // --- ANCIENT INDIA (Maurya & Gupta) ---
    "Maurya": "Mow-rya",
    "Chandragupta": "Chun-dra-goop-ta",
    "Bindusara": "Bin-doo-saa-ra",
    "Ashoka": "A-sho-ka",
    "Kautilya": "Kow-til-ya",
    "Arthashastra": "Ar-tha-shaas-tra",
    "Kushana": "Koo-shaa-na",
    "Kanishka": "Ka-nish-ka",
    "Gupta": "Goop-ta",
    "Samudragupta": "Sa-mu-dra-goop-ta",
    "Vikramaditya": "Vik-ra-maa-dit-ya",
    "Kalidasa": "Kaa-li-daa-sa",
    "Aryabhata": "Aar-ya-bhut-a",
    "Varahamihira": "Va-raa-ha-mi-hi-ra",

    // --- ANCIENT INDIA (Southern Dynasties) ---
    "Satavahana": "Saa-ta-vaa-ha-na",
    "Gautamiputra": "Gow-ta-mee-poo-tra",
    "Satakarni": "Su-ta-kar-nee",
    "Chola": "Cho-la",
    "Chera": "Chay-ra",
    "Pandya": "Paan-dya",
    "Karikala": "Ka-ree-kaa-la",
    "Pallava": "Pul-lu-va",
    "Mahendravarman": "Ma-hain-dra-vur-mun",
    "Narasimhavarman": "Na-ra-sim-ha-vur-mun",
    "Mamallapuram": "Ma-mul-la-poo-rum",
    "Chalukya": "Chaa-look-ya",
    "Pulakeshin": "Poo-la-kay-shin",
    "Rashtrakuta": "Raash-tra-koo-ta",
    "Dantidurga": "Dun-tee-door-ga",
    "Kailasa": "Ky-laa-sa",

    // --- MEDIEVAL INDIA (Sultanate & Mughals) ---
    "Prithviraj": "Prith-vee-raaj",
    "Chauhan": "Chow-haan",
    "Qutbuddin": "Kutubuddeen",
    "Aibak": "Eyebuck",
    "Iltutmish": "Iltootmish",
    "Razia": "Ru-zee-ya",
    "Balban": "Bul-bun",
    "Khilji": "Killjee",
    "Alauddin": "Alauddeen",
    "Kafur": "Kaa-foor",
    "Tughlaq": "Tooghluck",
    "Lodi": "Lodee",
    "Ibrahim": "Ib-raa-heem",
    "Panipat": "Paa-nee-put",
    "Babur": "Baabur",
    "Babar": "Baabur",
    "Humayun": "Humayunn",
    "Akbar": "Uk-bur",
    "Jahangir": "Ja-haan-geer",
    "Jahan": "Jahann",
    "Shahjahan": "Shahjahann",
    "Aurangzeb": "Orang-zabe",
    "Bahadur": "Ba-haa-dur",
    "Mughal": "Moogull",
    "Mughals": "Moogulls",

    // --- MEDIEVAL INDIA (Regional & Marathas) ---
    "Shivaji": "Shi-vaa-jee",
    "Sambhaji": "Sum-bhaa-jee",
    "Peshwa": "Pay-shwa",
    "Vijayanagara": "Vi-jay-na-ga-ra",
    "Harihara": "Hu-ree-hu-ra",
    "Bukka": "Book-ka",
    "Krishnadevaraya": "Krish-na-day-va-raa-ya",
    "Hampi": "Hum-pee",
    "Tenali": "Tay-naa-lee",
    "Bahmani": "Bah-mu-nee",
    "Suri": "Soo-ree",
    "Sher Shah": "Share Shah",

    // --- RELIGIOUS & CULTURAL REFORMERS ---
    "Bhakti": "Bhuk-tee",
    "Sufi": "Soo-fee",
    "Kabir": "Ka-beer",
    "Mira Bai": "Meera-by",
    "Tulsidas": "Tool-see-daas",
    "Surdas": "Soor-daas",
    "Nizamuddin": "Ni-zaa-moo-deen",
    "Auliya": "Ow-lee-ya",
    "Khusrau": "Khoos-ro",
    "Ramakrishna": "Raama-krish-na",
    "Vivekananda": "Vi-vay-kaa-nun-da",

    // --- MODERN INDIA (British & Revolts) ---
    "Plassey": "Pluh-see",
    "Buxar": "Buk-sur",
    "Clive": "Klyve",
    "Hastings": "Hay-stings",
    "Cornwallis": "Korn-waal-is",
    "Wellesley": "Wells-lee",
    "Dalhousie": "Dal-how-zee",
    "Mangal": "Mun-gul",
    "Pandey": "Paan-day",
    "Lakshmibai": "Luck-shmee-by",
    "Zafar": "Zu-fur",
    "Tantia": "Taan-tya",

    // --- MODERN INDIA (Social Reformers) ---
    "Ram Mohan": "Raam Mo-hun",
    "Dayananda": "Du-yaa-nun-da",
    "Saraswati": "Su-rus-wa-tee",
    "Vidyasagar": "Vid-yaa-saa-gur",
    "Jyotiba": "Jo-tee-baa",
    "Phule": "Foo-lay",
    "Savitribai": "Su-vit-ree-by",

    // --- MODERN INDIA (Freedom Struggle Leaders) ---
    "Gandhi": "Gaan-dhee",
    "Nehru": "Nay-roo",
    "Subhash": "Soo-bhaash",
    "Bose": "Bo-se",
    "Patel": "Pa-tale",
    "Bhagat": "Bha-gut",
    "Azad": "Aa-zaad",
    "Savarkar": "Saa-var-kar",
    "Ambedkar": "Um-bade-kar",
    "Tilak": "Ti-luck",
    "Gokhale": "Go-kha-lay",
    "Naoroji": "Now-ro-jee",
    "Satyagraha": "Sut-yaa-gra-ha",
    "Swadeshi": "Swa-day-shee",
    "Swaraj": "Swa-raaj",
    "Zamindar": "Za-meen-daar",
    "Jallianwala": "Jal-li-yan-waa-la",

    // --- GENERAL TERMS & SUFFIXES ---
    "pur": "poor",
    "abad": "a-baad",
    "Brahmin": "Braah-min",
    "Brahman": "Braah-mun",
    "Kshatriya": "Ksha-tree-ya",
    "Vaishya": "Vy-shya",
    "Shudra": "Shoo-dra",
    "Sikh": "Sik",
    "Khalsa": "Khaal-sa",
    "Guru": "Goo-roo",
    "Mahatma": "Ma-haat-ma",
    "Netaji": "Nay-taa-jee",
    "Sardar": "Sur-daar"
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
