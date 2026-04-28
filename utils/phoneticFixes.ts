/**
 * A dictionary of phonetic replacements for TTS engines (like Google Chirp)
 * that incorrectly apply native nasalized vowels or incorrect phonetics to English text.
 * 
 * For example, "Humayun" is natively pronounced with a nasal 'n' (Humayoo), 
 * dropping the hard consonant. We trick the AI by sending "Huma-yunn".
 */

const PHONETIC_MAP: Record<string, string> = {
    // --- ANCIENT INDIA (Vedic & Mahajanapadas) ---
    "Rigveda": "Rigvayda",
    "Samaveda": "Samavayda",
    "Yajurveda": "Yajurvayda",
    "Atharvaveda": "Atharvavayda",
    "Upanishads": "Oopanishuds",
    "Aranyakas": "Aarunyukus",
    "Brahmanas": "Braahmunus",
    "Mahajanapadas": "Mahaajanapadus",
    "Magadha": "Mugudha",
    "Pataliputra": "Patalipootra",
    "Varanasi": "Varaanasee",
    "Prayag": "Prayaag",
    "Kashi": "Kaashee",
    "Kosala": "Kosala",
    "Vatsa": "Vutsa",
    "Avanti": "Avuntee",
    "Gandhara": "Gundhaara",
    "Kamboja": "Kumboja",
    "Bimbisara": "Bimbisaara",
    "Ajatashatru": "Ajaatashatroo",
    "Sisunaga": "Shishoonaaga",
    "Mahapadma": "Mahaapudma",
    "Nanda": "Nunda",

    // --- ANCIENT INDIA (Maurya & Gupta) ---
    "Maurya": "Mowrya",
    "Chandragupta": "Chundragoopta",
    "Bindusara": "Bindoosaara",
    "Ashoka": "Ashoka",
    "Kautilya": "Kowtilya",
    "Arthashastra": "Arthashaastra",
    "Kushana": "Kooshaana",
    "Kanishka": "Kanishka",
    "Gupta": "Goopta",
    "Samudragupta": "Samudragoopta",
    "Vikramaditya": "Vikramaaditya",
    "Kalidasa": "Kaalidaasa",
    "Aryabhata": "Aaryabhuta",
    "Varahamihira": "Varaahamihira",

    // --- ANCIENT INDIA (Southern Dynasties) ---
    "Satavahana": "Saatavaahana",
    "Gautamiputra": "Gowtameepootra",
    "Satakarni": "Sutakarnee",
    "Chola": "Chola",
    "Chera": "Chayra",
    "Pandya": "Paandya",
    "Karikala": "Kareekaala",
    "Pallava": "Pulluva",
    "Mahendravarman": "Mahendravarmun",
    "Narasimhavarman": "Narasimhavarmun",
    "Mamallapuram": "Mamullapoorum",
    "Chalukya": "Chaalookya",
    "Pulakeshin": "Poolakayshin",
    "Rashtrakuta": "Raashtrakoota",
    "Dantidurga": "Dunteedoorga",
    "Kailasa": "Kylaasa",

    // --- MEDIEVAL INDIA (Sultanate & Mughals) ---
    "Prithviraj": "Prithveeraaj",
    "Chauhan": "Chowhaan",
    "Qutbuddin": "Kutubuddeen",
    "Aibak": "Eyebuck",
    "Iltutmish": "Iltootmish",
    "Razia": "Ruzeeya",
    "Balban": "Bulbun",
    "Khilji": "Killjee",
    "Alauddin": "Alauddeen",
    "Kafur": "Kaafoor",
    "Tughlaq": "Tooghluck",
    "Lodi": "Lodee",
    "Ibrahim": "Ibraaheem",
    "Panipat": "Paaneeput",
    "Babur": "Baabur",
    "Babar": "Baabur",
    "Humayun": "Humayunn",
    "Akbar": "Ukbur",
    "Jahangir": "Jahaangeer",
    "Jahan": "Jahann",
    "Shahjahan": "Shahjahann",
    "Aurangzeb": "Orangzabe",
    "Bahadur": "Bahaadur",
    "Mughal": "Moogull",
    "Mughals": "Moogulls",

    // --- MEDIEVAL INDIA (Regional & Marathas) ---
    "Shivaji": "Shivaajee",
    "Sambhaji": "Sumbhaajee",
    "Peshwa": "Payshwa",
    "Vijayanagara": "Vijaynagaram",
    "Harihara": "Hareehaara",
    "Bukka": "Bookka",
    "Krishnadevaraya": "Krishnadayvaaraaya",
    "Hampi": "Humpee",
    "Tenali": "Taynaalee",
    "Bahmani": "Bahmunee",
    "Suri": "Sooree",
    "Sher Shah": "Share Shah",

    // --- RELIGIOUS & CULTURAL REFORMERS ---
    "Bhakti": "Bhuktee",
    "Sufi": "Soofee",
    "Kabir": "Kabeer",
    "Mira Bai": "Meeraby",
    "Tulsidas": "Toolseedaas",
    "Surdas": "Soordaas",
    "Nizamuddin": "Nizaamoodeen",
    "Auliya": "Owleeya",
    "Khusrau": "Khoosro",
    "Ramakrishna": "Raamakrishna",
    "Vivekananda": "Vivaykaanunda",

    // --- MODERN INDIA (British & Revolts) ---
    "Plassey": "Pluhsee",
    "Buxar": "Buksur",
    "Clive": "Klyve",
    "Hastings": "Haystings",
    "Cornwallis": "Kornwaalis",
    "Wellesley": "Wellslee",
    "Dalhousie": "Dalhowzee",
    "Mangal": "Mungul",
    "Pandey": "Paanday",
    "Lakshmibai": "Luckshmeeby",
    "Zafar": "Zufur",
    "Tantia": "Taantya",

    // --- MODERN INDIA (Social Reformers) ---
    "Ram Mohan": "Raam Mohun",
    "Dayananda": "Duyaanunda",
    "Saraswati": "Suruswatee",
    "Vidyasagar": "Vidyaasaagur",
    "Jyotiba": "Joteebaa",
    "Phule": "Foolay",
    "Savitribai": "Suvitreeby",

    // --- MODERN INDIA (Freedom Struggle Leaders) ---
    "Gandhi": "Gaandhee",
    "Nehru": "Nayroo",
    "Subhash": "Soobhaash",
    "Bose": "Bose",
    "Patel": "Patale",
    "Bhagat": "Bhagut",
    "Azad": "Aazaad",
    "Savarkar": "Saavarkar",
    "Ambedkar": "Umbadekar",
    "Tilak": "Tiluck",
    "Gokhale": "Gokhalay",
    "Naoroji": "Nowrojee",
    "Satyagraha": "Sutyaagraha",
    "Swadeshi": "Swadayshee",
    "Swaraj": "Swaraaj",
    "Zamindar": "Zameendaar",
    "Jallianwala": "Jalliyanwaala",

    // --- GENERAL TERMS & SUFFIXES ---
    "pur": "poor",
    "abad": "abaad",
    "Brahmin": "Braahmin",
    "Brahman": "Braahmun",
    "Kshatriya": "Kshatreeya",
    "Vaishya": "Vyshya",
    "Shudra": "Shoodra",
    "Sikh": "Sik",
    "Khalsa": "Khaalsa",
    "Guru": "Gooroo",
    "Mahatma": "Mahaatma",
    "Netaji": "Naytaajee",
    "Sardar": "Surdaar"
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
