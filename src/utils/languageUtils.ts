import { SupportedLanguage } from '../types';

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    kn: string; // Kannada
    hi: string; // Hindi
    ta: string; // Tamil
    te: string; // Telugu
    ml: string; // Malayalam
    mr: string; // Marathi
    bn: string; // Bengali
  };
}

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string; nativeName: string }[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', label: 'Bengali', nativeName: 'বাংলা' },
];

export const UI_TRANSLATIONS: TranslationDictionary = {
  // Navigation & General
  'nav.discover': {
    en: 'Discover',
    kn: 'ಅನ್ವೇಷಿಸಿ',
    hi: 'खोजें',
    ta: 'கண்டறியவும்',
    te: 'కనుగొనండి',
    ml: 'കണ്ടെത്തുക',
    mr: 'शोधा',
    bn: 'আবিষ্কার করুন',
  },
  'nav.myReservations': {
    en: 'My Reservations',
    kn: 'ನನ್ನ ಬುಕಿಂಗ್‌ಗಳು',
    hi: 'मेरी बुकिंग',
    ta: 'என் முன்பதிவுகள்',
    te: 'నా బుకింగ్‌లు',
    ml: 'എന്റെ റിസർവേഷനുകൾ',
    mr: 'माझे बुकिंग',
    bn: 'আমার বুকিং',
  },
  'nav.travelDining': {
    en: 'Travel Dining',
    kn: 'ಪ್ರಯಾಣ ಭೋಜನ',
    hi: 'यात्रा डाइनिंग',
    ta: 'பயண உணவு',
    te: 'ప్రయాణ భోజనం',
    ml: 'യാത്രാ ഭക്ഷണം',
    mr: 'प्रवास जेवण',
    bn: 'ভ্রমণ ডাইনিং',
  },
  'nav.partnerDashboard': {
    en: 'Partner Stand',
    kn: 'ರೆಸ್ಟೋರೆಂಟ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    hi: 'पार्टनर स्टैंड',
    ta: 'பார்ட்னர் ஸ்டாண்ட்',
    te: 'భాగస్వామి స్టాండ్',
    ml: 'പാർട്ണർ സ്റ്റാൻഡ്',
    mr: 'पार्टनर स्टँड',
    bn: 'পার্টনার স্ট্যান্ড',
  },
  'nav.companyAdmin': {
    en: 'Company Admin',
    kn: 'ಕಂಪನಿ ನಿರ್ವಾಹಕ',
    hi: 'कंपनी एडमिन',
    ta: 'நிறுவன நிர்வாகம்',
    te: 'కంపెనీ అడ్మిన్',
    ml: 'കമ്പനി അഡ്മിൻ',
    mr: 'कंपनी अ‍ॅडमिन',
    bn: 'কোম্পানি অ্যাডমিন',
  },
  'nav.login': {
    en: 'Sign In',
    kn: 'ಸೈನ್ ಇನ್',
    hi: 'साइन इन करें',
    ta: 'உள்நுழைக',
    te: 'సైన్ ఇన్',
    ml: 'സൈൻ ഇൻ ചെയ്യുക',
    mr: 'साइन इन',
    bn: 'সাইন ইন করুন',
  },
  'nav.logout': {
    en: 'Sign Out',
    kn: 'ಸೈನ್ ಔಟ್',
    hi: 'साइन आउट',
    ta: 'வெளியேறு',
    te: 'సైన్ అవుట్',
    ml: 'ലോഗ് ഔട്ട്',
    mr: 'साइन आउट',
    bn: 'সাইন আউট',
  },

  // Booking & Table Selection
  'booking.timeIn': {
    en: 'Time In',
    kn: 'ಪ್ರವೇಶ ಸಮಯ (Time In)',
    hi: 'प्रवेश समय (Time In)',
    ta: 'நுழைவு நேரம்',
    te: 'ప్రవేశ సమయం',
    ml: 'പ്രവേശന സമയം',
    mr: 'प्रवेश वेळ',
    bn: 'প্রবেশের সময়',
  },
  'booking.timeOut': {
    en: 'Time Out',
    kn: 'ನಿರ್ಗಮನ ಸಮಯ (Time Out)',
    hi: 'प्रस्थान समय (Time Out)',
    ta: 'வெளியேறும் நேரம்',
    te: 'నిష్క్రమణ సమయం',
    ml: 'പുറപ്പെടുന്ന സമയം',
    mr: 'बाहेर पडण्याची वेळ',
    bn: 'প্রস্থানের সময়',
  },
  'booking.selectFloor': {
    en: 'Select Floor',
    kn: 'ಮಹಡಿ ಆಯ್ಕೆಮಾಡಿ',
    hi: 'मंज़िल चुनें',
    ta: 'தளத்தைத் தேர்ந்தெடுக்கவும்',
    te: 'అంతస్తును ఎంచుకోండి',
    ml: 'നില തിരഞ്ഞെടുക്കുക',
    mr: 'मजला निवडा',
    bn: 'তলা নির্বাচন করুন',
  },
  'booking.chooseTable': {
    en: 'Choose Table',
    kn: 'ಟೇಬಲ್ ಆರಿಸಿ',
    hi: 'टेबल चुनें',
    ta: 'மேசையைத் தேர்வுசெய்க',
    te: 'టేబుల్ ఎంచుకోండి',
    ml: 'മേശ തിരഞ്ഞെടുക്കുക',
    mr: 'टेबल निवडा',
    bn: 'টেবিল বাছুন',
  },
  'booking.available': {
    en: 'Available',
    kn: 'ಲಭ್ಯವಿದೆ',
    hi: 'उपलब्ध',
    ta: 'கிடைக்கிறது',
    te: 'అందుబాటులో ఉంది',
    ml: 'ലഭ്യമാണ്',
    mr: 'उपलब्ध',
    bn: 'উপলব্ধ',
  },
  'booking.reserved': {
    en: 'Reserved',
    kn: 'ಕಾದಿರಿಸಲಾಗಿದೆ',
    hi: 'आरक्षित',
    ta: 'முன்பதிவு செய்யப்பட்டது',
    te: 'రిజర్వ్ చేయబడింది',
    ml: 'റിസർവ്വ് ചെയ്തു',
    mr: 'आरक्षित',
    bn: 'সংরক্ষিত',
  },
  'booking.occupied': {
    en: 'Occupied',
    kn: 'ಭರ್ತಿಯಾಗಿದೆ',
    hi: 'व्यस्त (Occupied)',
    ta: 'நிரம்பியுள்ளது',
    te: 'ఆక్రమించబడింది',
    ml: 'ആളുകളുണ്ട്',
    mr: 'भरलेले',
    bn: 'অধিকৃত',
  },
  'booking.seats': {
    en: 'Seats',
    kn: 'ಆಸನಗಳು',
    hi: 'सीटें',
    ta: 'இருக்கைகள்',
    te: 'సీట్లు',
    ml: 'സീറ്റുകൾ',
    mr: 'जागा',
    bn: 'আসন',
  },
  'booking.guests': {
    en: 'Guests',
    kn: 'ಅತಿಥಿಗಳು',
    hi: 'अतिथि',
    ta: 'விருந்தினர்கள்',
    te: 'అతిథులు',
    ml: 'അതിഥികൾ',
    mr: 'पाहुणे',
    bn: 'অতিথি',
  },
  'booking.editTimes': {
    en: 'Edit Time In / Time Out',
    kn: 'ಸಮಯವನ್ನು ಬದಲಾಯಿಸಿ',
    hi: 'समय इन / समय आउट बदलें',
    ta: 'நேரத்தை மாற்றவும்',
    te: 'సమయాన్ని సవరించండి',
    ml: 'സമയം തിരുത്തുക',
    mr: 'वेळ संपादित करा',
    bn: 'সময় পরিবর্তন করুন',
  },

  // Customer Profile & Settings
  'profile.title': {
    en: 'Customer Profile & Settings',
    kn: 'ಗ್ರಾಹಕರ ವಿವರ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    hi: 'ग्राहक प्रोफ़ाइल और सेटिंग्स',
    ta: 'சுயவிவரம் மற்றும் அமைப்புகள்',
    te: 'కస్టమర్ ప్రొఫైల్ మరియు సెట్టింగ్‌లు',
    ml: 'പ്രൊഫൈലും ക്രമീകരണങ്ങളും',
    mr: 'ग्राहक प्रोफाईल आणि सेटिंग्ज',
    bn: 'গ্রাহক প্রোফাইল এবং সেটিংস',
  },
  'profile.personalInfo': {
    en: 'Personal Information',
    kn: 'ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ',
    hi: 'व्यक्तिगत जानकारी',
    ta: 'தனிப்பட்ட தகவல்',
    te: 'వ్యక్తిగత సమాచారం',
    ml: 'വ്യക്തിഗത വിവരങ്ങൾ',
    mr: 'वैयक्तिक माहिती',
    bn: 'ব্যক্তিগত তথ্য',
  },
  'profile.language': {
    en: 'Preferred Language',
    kn: 'ಆದ್ಯತೆಯ ಭಾಷೆ',
    hi: 'पसंदीदा भाषा',
    ta: 'விருப்பமான மொழி',
    te: 'ఇష్టపడే భాష',
    ml: 'ഇഷ്ടമുള്ള ഭാഷ',
    mr: 'पसंतीची भाषा',
    bn: 'পছন্দের ভাষা',
  },
  'profile.history': {
    en: 'Booking / Reservation History',
    kn: 'ಬುಕಿಂಗ್ ಇತಿಹಾಸ',
    hi: 'बुकिंग इतिहास',
    ta: 'முன்பதிவு வரலாறு',
    te: 'బుకింగ్ చరిత్ర',
    ml: 'ബുക്കിംഗ് ചരിത്രം',
    mr: 'बुकिंग इतिहास',
    bn: 'বুকিং ইতিহাস',
  },
  'profile.deleteAccount': {
    en: 'Delete Account',
    kn: 'ಖಾತೆಯನ್ನು ಅಳಿಸಿ',
    hi: 'खाता हटाएं',
    ta: 'கணக்கை நீக்குக',
    te: 'ఖాతాను తొలగించండి',
    ml: 'അക്കൗണ്ട് ഇല്ലാതാക്കുക',
    mr: 'खाते हटवा',
    bn: 'অ্যাকাউন্ট মুছুন',
  },
  'profile.verified': {
    en: 'Verified',
    kn: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    hi: 'सत्यापित',
    ta: 'சரிபார்க்கப்பட்டது',
    te: 'ధృవీకరించబడింది',
    ml: 'പരിശോധിച്ചു',
    mr: 'सत्यापित',
    bn: 'যাচাইকৃত',
  },
  'profile.notVerified': {
    en: 'Not Verified',
    kn: 'ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ',
    hi: 'सत्यापित नहीं',
    ta: 'சரிபார்க்கப்படவில்லை',
    te: 'ధృవీకరించబడలేదు',
    ml: 'പരിശോധിച്ചിട്ടില്ല',
    mr: 'सत्यापित नाही',
    bn: 'যাচাই করা হয়নি',
  },
};

export const getLanguagePreference = (): SupportedLanguage => {
  try {
    const saved = localStorage.getItem('flashtable_preferred_language');
    if (saved && ['en', 'kn', 'hi', 'ta', 'te', 'ml', 'mr', 'bn'].includes(saved)) {
      return saved as SupportedLanguage;
    }
  } catch {}
  return 'en';
};

export const saveLanguagePreference = (lang: SupportedLanguage): void => {
  try {
    localStorage.setItem('flashtable_preferred_language', lang);
  } catch {}
};

export const t = (key: string, lang: SupportedLanguage = 'en'): string => {
  const entry = UI_TRANSLATIONS[key];
  if (!entry) return key;
  return entry[lang] || entry['en'] || key;
};
