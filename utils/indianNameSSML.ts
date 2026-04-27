/**
 * Indian Name SSML Preprocessor
 * 
 * Detects Indian proper nouns (names, places, cultural terms) in quiz text
 * and wraps them in SSML <lang xml:lang="hi-IN"> tags so Google Cloud TTS
 * pronounces them with native Hindi/Indian phonetics instead of anglicizing them.
 *
 * Example:
 *   Input:  "Who was Subhash Chandra Bose?"
 *   Output: '<speak>Who was <lang xml:lang="hi-IN">Subhash Chandra Bose</lang>?</speak>'
 */

// ── Common Indian names, places, and cultural terms ──
// This list covers freedom fighters, historical figures, cities, rivers,
// cultural/religious terms that Google TTS typically mispronounces.

const INDIAN_NAMES: string[] = [
  // Freedom Fighters & Political Leaders
  'Mahatma Gandhi', 'Mohandas Karamchand Gandhi', 'Jawaharlal Nehru',
  'Subhash Chandra Bose', 'Netaji', 'Bhagat Singh', 'Lala Lajpat Rai',
  'Bal Gangadhar Tilak', 'Sardar Vallabhbhai Patel', 'Rajendra Prasad',
  'Ambedkar', 'Babasaheb', 'Sarojini Naidu', 'Rani Lakshmibai',
  'Mangal Pandey', 'Chandrashekhar Azad', 'Veer Savarkar',
  'Maulana Abul Kalam Azad', 'Ram Prasad Bismil', 'Ashfaqullah Khan',
  'Bipin Chandra Pal', 'Dadabhai Naoroji', 'Gopal Krishna Gokhale',
  'Sukhdev', 'Rajguru', 'Annie Besant', 'Chittaranjan Das',
  'Khan Abdul Ghaffar Khan', 'Aruna Asaf Ali',

  // Historical Rulers & Empires
  'Chandragupta Maurya', 'Ashoka', 'Samudragupta', 'Akbar',
  'Shah Jahan', 'Aurangzeb', 'Babur', 'Humayun', 'Sher Shah Suri',
  'Prithviraj Chauhan', 'Maharana Pratap', 'Shivaji', 'Chhatrapati',
  'Tipu Sultan', 'Ranjit Singh', 'Rani Padmini', 'Rani Durgavati',
  'Krishnadevaraya', 'Rajendra Chola', 'Pulakeshin',

  // Mythological & Religious
  'Ramayana', 'Mahabharata', 'Bhagavad Gita', 'Vedas', 'Upanishads',
  'Arjuna', 'Krishna', 'Rama', 'Sita', 'Hanuman', 'Draupadi',
  'Bhishma', 'Karna', 'Yudhishthira', 'Duryodhana',

  // Scientists, Poets, Reformers
  'Rabindranath Tagore', 'Srinivasa Ramanujan', 'C.V. Raman',
  'Homi Bhabha', 'Vikram Sarabhai', 'APJ Abdul Kalam',
  'Swami Vivekananda', 'Raja Ram Mohan Roy', 'Ishwar Chandra Vidyasagar',
  'Jyotirao Phule', 'Savitribai Phule', 'Mirza Ghalib',
  'Tulsidas', 'Kabir', 'Surdas', 'Meera Bai',

  // Major Cities & Places
  'Varanasi', 'Prayagraj', 'Kashi', 'Ayodhya', 'Mathura', 'Dwarka',
  'Ujjain', 'Hampi', 'Vijayanagara', 'Pataliputra', 'Taxila',
  'Nalanda', 'Takshashila', 'Kurukshetra', 'Hastinapura',
  'Thanjavur', 'Mahabalipuram', 'Konark', 'Khajuraho',
  'Hyderabad', 'Bengaluru', 'Thiruvananthapuram', 'Visakhapatnam',
  'Ahmedabad', 'Chandigarh', 'Lucknow', 'Jaipur', 'Bhopal',

  // Rivers & Geography
  'Ganga', 'Yamuna', 'Saraswati', 'Godavari', 'Krishna', 'Kaveri',
  'Narmada', 'Brahmaputra', 'Chambal', 'Tungabhadra',
  'Himalaya', 'Vindhya', 'Sahyadri', 'Aravalli', 'Deccan',

  // Cultural / Administrative Terms
  'Panchayat', 'Sarpanch', 'Zamindar', 'Ryotwari', 'Mahalwari',
  'Satyagraha', 'Ahimsa', 'Swadeshi', 'Swaraj', 'Purna Swaraj',
  'Dandi March', 'Quit India', 'Jallianwala Bagh',
  'Dharma', 'Karma', 'Moksha', 'Nirvana', 'Yoga', 'Guru',
  'Ashram', 'Mandir', 'Masjid', 'Gurudwara',
  'Lok Sabha', 'Rajya Sabha', 'Vidhan Sabha',
];

// ── Single-word Indian name fragments (for catching unlisted names) ──
// These are common Indian name components that signal "this word is Indian"
const INDIAN_NAME_FRAGMENTS: string[] = [
  'Singh', 'Kumar', 'Sharma', 'Gupta', 'Patel', 'Reddy', 'Rao',
  'Nair', 'Menon', 'Pillai', 'Iyer', 'Iyengar', 'Naidu', 'Choudhury',
  'Mukherjee', 'Banerjee', 'Chatterjee', 'Bhattacharya', 'Chakraborty',
  'Devi', 'Bai', 'Bhai', 'Das', 'Sen', 'Bose', 'Ghosh', 'Mitra',
  'Joshi', 'Kulkarni', 'Deshmukh', 'Patil', 'Shinde', 'Jadhav',
  'Verma', 'Mishra', 'Pandey', 'Tiwari', 'Dwivedi', 'Srivastava',
  'Swami', 'Pandit', 'Shri', 'Sri', 'Bapu',
  'Deen', 'Uddin', 'Ullah', 'Khan', 'Begum', 'Sultana',
];

/**
 * Build a case-insensitive regex that matches multi-word Indian names.
 * Sorted by length (longest first) so "Subhash Chandra Bose" matches before "Bose".
 */
const buildNameRegex = (): RegExp => {
  const sorted = [...INDIAN_NAMES].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
};

/**
 * Build a regex for single-word Indian surname/title fragments.
 * These are wrapped only when they appear as standalone capitalized words
 * that weren't already caught by the multi-word pass.
 */
const buildFragmentRegex = (): RegExp => {
  const escaped = INDIAN_NAME_FRAGMENTS.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
};

const MULTI_WORD_REGEX = buildNameRegex();
const FRAGMENT_REGEX = buildFragmentRegex();

/**
 * Converts plain quiz text into SSML with <lang xml:lang="hi-IN"> tags
 * wrapped around detected Indian proper nouns.
 *
 * @param text - The raw quiz question/answer text
 * @returns SSML-wrapped string ready for Google Cloud TTS
 */
export function wrapIndianNamesInSSML(text: string): string {
  // Track which character ranges have already been wrapped (to prevent double-wrapping)
  const wrappedRanges: Array<[number, number]> = [];

  // Pass 1: Wrap multi-word Indian names (highest priority)
  let result = text.replace(MULTI_WORD_REGEX, (match, _p1, offset) => {
    wrappedRanges.push([offset, offset + match.length]);
    return `<lang xml:lang="hi-IN">${match}</lang>`;
  });

  // Pass 2: Wrap single-word Indian fragments (only if not already inside a <lang> tag)
  // We need to re-process the result string, so we use a simple approach:
  // check if the match is already inside a <lang> block
  result = result.replace(FRAGMENT_REGEX, (match, _p1, offset) => {
    // Check if this position is already inside a <lang>...</lang> block
    const beforeMatch = result.substring(0, offset);
    const openTags = (beforeMatch.match(/<lang /g) || []).length;
    const closeTags = (beforeMatch.match(/<\/lang>/g) || []).length;
    if (openTags > closeTags) {
      // Already inside a <lang> tag — don't double-wrap
      return match;
    }
    return `<lang xml:lang="hi-IN">${match}</lang>`;
  });

  // Wrap in <speak> root element (required for SSML)
  return `<speak>${result}</speak>`;
}

/**
 * Checks if the text contains any Indian names that would benefit from SSML wrapping.
 */
export function hasIndianNames(text: string): boolean {
  return MULTI_WORD_REGEX.test(text) || FRAGMENT_REGEX.test(text);
}
