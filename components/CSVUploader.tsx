
import React, { useState, useRef } from 'react';
import { Question, QuizConfig, LayoutMode, ThemeOption } from '../types.ts';

import { SoundEngine } from '../utils/SoundEngine.ts';

interface CSVUploaderProps {
  onQuestionsLoaded: (questions: Question[], config: QuizConfig) => void;
}

export const QUIZ_THEMES: ThemeOption[] = [
  { id: 'default', name: 'Navy Cinematic (Default)', bg: '#04192c', card: '#0B2545', accent: '#4F46E5' },
  { id: 'obsidian', name: 'Obsidian Black', bg: '#09090b', card: '#171717', accent: '#10b981' },
  { id: 'amethyst', name: 'Amethyst Night', bg: '#1f0931', card: '#2d1445', accent: '#c026d3' },
  { id: 'crimson', name: 'Blood Moon', bg: '#2e0413', card: '#4c0b24', accent: '#e11d48' },
  { id: 'ocean', name: 'Deep Ocean', bg: '#042f2e', card: '#0f766e', accent: '#06b6d4' }
];

const ELEVENLABS_VOICES = [
  { id: 'tQHPlZCaA3Oe1X8BqFIp', name: 'Niladri (Teacher)' },
  { id: 'pNInz6obbfDQGcgMyIGC', name: 'Adam (Narrator)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Dynamic)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Calm)' },
  { id: 'XB0fDUnXU5powW0NhzG7', name: 'Charlotte (Engaging)' }
];

const GEMINI_VOICES = [
  // Standard English
  { id: 'Zephyr', name: 'Zephyr (Bright)' },
  { id: 'Puck', name: 'Puck (Upbeat)' },
  { id: 'Charon', name: 'Charon (Informative)' },
  { id: 'Kore', name: 'Kore (Firm)' },
  { id: 'Fenrir', name: 'Fenrir (Excitable)' },
  { id: 'Aoede', name: 'Aoede (Breezy)' },
  // Indian English Accent
  { id: 'Puck-IN', name: 'Puck (Indian)' },
  { id: 'Charon-IN', name: 'Charon (Indian)' },
  { id: 'Kore-IN', name: 'Kore (Indian)' },
];

const GOOGLE_VOICES = [
  { id: 'en-IN-Chirp-HD-D', name: 'Google India Male (Premium)' },
  { id: 'en-IN-Chirp-HD-F', name: 'Google India Female (Premium)' },
  { id: 'en-IN-Neural2-D', name: 'Google India Male (Standard HD)' },
  { id: 'en-IN-Neural2-A', name: 'Google India Female (Standard HD)' },
  { id: 'en-US-Neural2-D', name: 'Google US Male (Standard HD)' },
  { id: 'en-US-Neural2-F', name: 'Google US Female (Standard HD)' },
];

// OpenAI uses a fixed voice (alloy) + Indian MCQ instruction — voice is locked for consistency
const OPENAI_VOICES = [
  { id: 'alloy-mcq', name: 'Alloy — Indian MCQ Reader (Fixed)' },
];

const CSVUploader: React.FC<CSVUploaderProps> = ({ onQuestionsLoaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');

  // Config State
  const [isAutomatic, setIsAutomatic] = useState(false);
  const [autoTimeLimit, setAutoTimeLimit] = useState(15);
  const [recordSession, setRecordSession] = useState(false);
  // Forced Landscape Mode
  const layoutMode: LayoutMode = 'LANDSCAPE';
  const [selectedThemeId, setSelectedThemeId] = useState('default');
  const [enableSound, setEnableSound] = useState(true);
  const [enableTTS, setEnableTTS] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [isTestingTTS, setIsTestingTTS] = useState(false);
  const [ttsTestError, setTtsTestError] = useState<string | null>(null);
  const [withPicture, setWithPicture] = useState(false);
  const [optionsOff, setOptionsOff] = useState(false);
  const [addIntroOutro, setAddIntroOutro] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [revealImageWithAnswer, setRevealImageWithAnswer] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'gemini' | 'google' | 'hybrid' | 'openai'>('gemini');
  const [selectedVoiceId, setSelectedVoiceId] = useState('Puck-IN');

  const [loadedQuestions, setLoadedQuestions] = useState<Question[] | null>(null);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSVText = (text: string) => {
    try {
      // Robust splitting for various line endings
      const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error("No data found");

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const parsed = lines.slice(1).map((line, idx) => {
        // Robust CSV split ignoring commas inside quotes
        const vals = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));

        if (vals.length < 2) return null; // Skip malformed lines

        const q: any = { id: idx + 1 };
        headers.forEach((h, i) => {
          if (h.includes('question')) q.question = vals[i];
          if (h.includes('optiona')) q.optionA = vals[i];
          if (h.includes('optionb')) q.optionB = vals[i];
          if (h.includes('optionc')) q.optionC = vals[i];
          if (h.includes('optiond')) q.optionD = vals[i];
          if (h.includes('correct')) q.correctAnswer = (vals[i]?.toUpperCase().replace(/[^A-D]/g, '') || 'A') as any;
          if (h.includes('image') || h.includes('url')) q.imageUrl = vals[i] || undefined;
          if (h.includes('time')) q.timeLimit = parseInt(vals[i]) || 30;
        });
        return q as Question;
      }).filter(q => q !== null) as Question[];

      if (parsed.length === 0) throw new Error("No valid questions parsed");
      setLoadedQuestions(parsed);
      setError(null);
    } catch (err) {
      setError("Invalid CSV format. Please ensure standard headers (Question, OptionA, etc.)");
      setLoadedQuestions(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => processCSVText(e.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handlePasteProcess = () => {
    if (!pastedText.trim()) return;
    processCSVText(pastedText);
  };

  const handleStartSimulation = () => {
    if (!testTitle.trim()) { setError("Assessment title is required."); return; }
    if (!loadedQuestions) { setError("Data source is required."); return; }
    onQuestionsLoaded(loadedQuestions, {
      isTimed: true,
      isAutomatic,
      autoTimeLimit,
      title: testTitle,
      recordSession,
      layoutMode,
      theme: QUIZ_THEMES.find(t => t.id === selectedThemeId) || QUIZ_THEMES[0],
      enableSound,
      enableTTS,
      withPicture,
      optionsOff,
      voiceId: selectedVoiceId,
      ttsProvider,
      addIntroOutro,
      isVertical,
      revealImageWithAnswer
    });
  };

  const canStart = testTitle.trim() !== '' && loadedQuestions !== null;
  const currentTheme = QUIZ_THEMES.find(t => t.id === selectedThemeId) || QUIZ_THEMES[0];

  return (
    <div className="w-full h-full min-h-screen bg-[#0E1521] flex items-center justify-center p-6 text-white/90">
      <div className="w-full max-w-[1300px] flex flex-col gap-6">
        {/* Header */}
        <header className="px-2">
          <h1 className="text-4xl font-black tracking-tight text-white">TTS <span className="text-indigo-400">Studio</span></h1>
          <p className="text-sm text-white/40 mt-1 uppercase tracking-[0.2em] font-bold">Configure, upload, and generate your TTS content.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-8">

           {/* LEFT PANEL: SETUP */}
          <div className="space-y-8">
            
            {/* Project Title */}
            <div className="bg-[#141C2B]/50 border border-white/5 rounded-xl p-8 space-y-4 shadow-sm">
               <div className="flex flex-col gap-1">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">PROJECT</h2>
                  <p className="text-lg font-bold">Project Title</p>
                  <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Give your project a name</p>
               </div>
               <input
                type="text"
                placeholder="e.g. History Quiz #1"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full py-4 px-6 bg-black/20 border border-white/5 rounded-xl focus:border-indigo-500/50 transition-all outline-none text-lg font-bold text-white placeholder:text-white/10"
              />
            </div>

            {/* Theme Selection */}
            <div className="bg-[#141C2B]/50 border border-white/5 rounded-xl p-8 space-y-6">
               <div className="flex flex-col gap-1">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">THEME</h2>
                  <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Choose your color theme</p>
               </div>
               <div className="flex gap-4">
                  {QUIZ_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedThemeId(theme.id)}
                      title={theme.name}
                      className={`w-14 h-14 rounded-xl transition-all border-2 relative group overflow-hidden ${selectedThemeId === theme.id ? 'border-indigo-500 scale-110 shadow-lg' : 'border-white/5 hover:border-white/20'}`}
                      style={{ backgroundColor: theme.bg }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }}></div>
                      </div>
                      {selectedThemeId === theme.id && (
                        <div className="absolute bottom-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
               </div>
            </div>

            {/* Engine Settings Clusters */}
            <div className="bg-[#141C2B]/50 border border-white/5 rounded-xl p-8 space-y-8">
               <div className="flex flex-col gap-1">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">ENGINE SETTINGS</h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PLAYBACK */}
                  <div className="bg-black/20 border border-white/5 rounded-xl p-6 space-y-5">
                     <div className="flex items-center gap-3 text-white/60">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">PLAYBACK</h3>
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-xs font-bold">Auto Advance</p>
                              <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-0.5">Move to next slide automatically</p>
                           </div>
                           <button onClick={() => setIsAutomatic(!isAutomatic)} className={`w-10 h-5 rounded-full relative transition-colors ${isAutomatic ? 'bg-indigo-500' : 'bg-white/10'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAutomatic ? 'left-5' : 'left-0.5'}`} />
                           </button>
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-xs font-bold">AI Reader</p>
                              <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-0.5">Google Gemini reads your content</p>
                           </div>
                           <button onClick={() => setEnableTTS(!enableTTS)} className={`w-10 h-5 rounded-full relative transition-colors ${enableTTS ? 'bg-indigo-500' : 'bg-white/10'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enableTTS ? 'left-5' : 'left-0.5'}`} />
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* AUDIO */}
                  <div className="bg-black/20 border border-white/5 rounded-xl p-6 space-y-5">
                     <div className="flex items-center gap-3 text-white/60">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">AUDIO</h3>
                     </div>
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">TTS Provider</p>
                           <div className="flex bg-black/40 p-1 rounded-lg gap-1 border border-white/5">
                              {['elevenlabs', 'gemini', 'google', 'openai'].map(p => (
                                 <button 
                                    key={p} 
                                    onClick={() => setTtsProvider(p as any)}
                                    className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${ttsProvider === p ? 'bg-indigo-500 text-white shadow-md' : 'text-white/30 hover:text-white/60'}`}
                                 >
                                    {p === 'elevenlabs' ? 'Eleven' : p.charAt(0).toUpperCase() + p.slice(1)}
                                 </button>
                              ))}
                           </div>
                        </div>
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Voice Persona</p>
                           <div className="flex gap-2">
                              <select 
                                 value={selectedVoiceId}
                                 onChange={(e) => setSelectedVoiceId(e.target.value)}
                                 className="flex-grow bg-black/40 border border-white/5 text-white text-[10px] font-bold py-2 px-3 rounded-lg outline-none cursor-pointer"
                              >
                                 {ttsProvider === 'elevenlabs' && ELEVENLABS_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                 {ttsProvider === 'gemini' && GEMINI_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                 {ttsProvider === 'google' && GOOGLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                 {ttsProvider === 'openai' && OPENAI_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                              <button 
                                 onClick={async () => {
                                    setIsTestingTTS(true);
                                    const ttsAdapter = await import('../services/ttsAdapter.ts');
                                    const data = await ttsAdapter.speakText("Testing current voice selection.", selectedVoiceId, ttsProvider);
                                    if (data) SoundEngine.playBase64Audio(data);
                                    setIsTestingTTS(false);
                                 }}
                                 disabled={isTestingTTS}
                                 className="px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                 {isTestingTTS ? '...' : 'Test'}
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* ENHANCEMENTS */}
                  <div className="bg-black/20 border border-white/5 rounded-xl p-6 space-y-5 md:col-span-2">
                     <div className="flex items-center gap-3 text-white/60">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">ENHANCEMENTS</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center justify-between gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                           <div>
                              <p className="text-xs font-bold">Studio SFX</p>
                              <p className="text-[9px] text-white/30 uppercase font-bold mt-0.5">Ambient sound</p>
                           </div>
                           <button onClick={() => setEnableSound(!enableSound)} className={`w-8 h-4 rounded-full relative transition-colors ${enableSound ? 'bg-indigo-500' : 'bg-white/10'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${enableSound ? 'left-4.5' : 'left-0.5'}`} />
                           </button>
                        </div>
                        <div className="flex items-center justify-between gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                           <div>
                              <p className="text-xs font-bold">Cinematic Slides</p>
                              <p className="text-[9px] text-white/30 uppercase font-bold mt-0.5">Smooth transitions</p>
                           </div>
                           <button onClick={() => setAddIntroOutro(!addIntroOutro)} className={`w-8 h-4 rounded-full relative transition-colors ${addIntroOutro ? 'bg-indigo-500' : 'bg-white/10'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${addIntroOutro ? 'left-4.5' : 'left-0.5'}`} />
                           </button>
                        </div>
                        <div className="flex items-center justify-between gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                           <div>
                              <p className="text-xs font-bold">Sync Reveal</p>
                              <p className="text-[9px] text-white/30 uppercase font-bold mt-0.5">Audio-text lock</p>
                           </div>
                           <button onClick={() => setRevealImageWithAnswer(!revealImageWithAnswer)} className={`w-8 h-4 rounded-full relative transition-colors ${revealImageWithAnswer ? 'bg-indigo-500' : 'bg-white/10'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${revealImageWithAnswer ? 'left-4.5' : 'left-0.5'}`} />
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* VISUAL */}
                  <div className="bg-black/20 border border-white/5 rounded-xl p-6 space-y-5">
                     <div className="flex items-center gap-3 text-white/60">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">VISUAL</h3>
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <p className="text-xs font-bold">Canvas Format</p>
                           <select 
                              value={isVertical ? 'vertical' : 'landscape'}
                              onChange={(e) => setIsVertical(e.target.value === 'vertical')}
                              className="bg-black/40 border border-white/5 text-white/60 text-[9px] px-3 py-1.5 rounded-lg outline-none uppercase font-black tracking-widest"
                           >
                              <option value="landscape">16:9 Landscape</option>
                              <option value="vertical">9:16 Vertical</option>
                           </select>
                        </div>
                        <div className="flex items-center justify-between">
                           <p className="text-xs font-bold">With Picture</p>
                           <button onClick={() => setWithPicture(!withPicture)} className={`w-10 h-5 rounded-full relative transition-colors ${withPicture ? 'bg-indigo-500' : 'bg-white/10'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${withPicture ? 'left-5' : 'left-0.5'}`} />
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* RECORDING */}
                  <div className="bg-black/20 border border-white/5 rounded-xl p-6 space-y-5">
                     <div className="flex items-center gap-3 text-white/60">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">RECORDING</h3>
                     </div>
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="text-xs font-bold">Studio Record</p>
                           <p className="text-[9px] text-white/30 uppercase font-bold mt-0.5">Record voice in Studio</p>
                        </div>
                        <button onClick={() => setRecordSession(!recordSession)} className={`w-10 h-5 rounded-full relative transition-colors ${recordSession ? 'bg-indigo-500' : 'bg-white/10'}`}>
                           <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${recordSession ? 'left-5' : 'left-0.5'}`} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* RIGHT PANEL: DATA & ACTION */}
          <div className="space-y-6 lg:sticky lg:top-6 h-fit">
            
            {/* DATA INPUT */}
            <div className="bg-[#141C2B]/50 border border-white/5 rounded-xl p-6 space-y-6">
               <div className="flex items-center gap-3 text-white/60">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">DATA INPUT</h2>
               </div>

               <div className="bg-black/30 rounded-full p-1 flex gap-1 border border-white/5">
                  <button onClick={() => setActiveTab('upload')} className={`flex-1 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-[#1A2333] text-white shadow-sm border border-white/10' : 'text-white/20 hover:text-white/40'}`}>CSV Upload</button>
                  <button onClick={() => setActiveTab('paste')} className={`flex-1 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'paste' ? 'bg-[#1A2333] text-white shadow-sm border border-white/10' : 'text-white/20 hover:text-white/40'}`}>Paste Text</button>
               </div>

               <div className="relative group min-h-[160px]">
                  {activeTab === 'upload' ? (
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full h-full min-h-[160px] flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer border border-white/5 bg-black/20 hover:bg-black/30 overflow-hidden relative`}
                     >
                        <div className="text-center p-6">
                           <div className="w-10 h-10 bg-[#1A2333] border border-white/10 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                           </div>
                           <p className="text-xs font-bold text-white">Upload CSV File</p>
                           <p className="text-[9px] text-white/20 uppercase font-black mt-1">Drag and drop or click to browse</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                        {loadedQuestions && (
                           <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-indigo-500/50 rounded-xl">
                              <p className="text-indigo-400 font-black text-xs uppercase tracking-widest">{loadedQuestions.length} Questions Loaded</p>
                              <button onClick={(e) => { e.stopPropagation(); setLoadedQuestions(null); }} className="mt-2 text-[9px] text-white/40 hover:text-white uppercase font-black">Reset</button>
                           </div>
                        )}
                     </div>
                  ) : (
                     <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Paste your CSV content here..."
                        className="w-full h-[160px] p-4 bg-black/20 border border-white/5 rounded-xl transition-all outline-none resize-none font-mono text-[10px] text-white/50 focus:text-white/80"
                     />
                  )}
               </div>
            </div>

            {/* PREVIEW */}
            <div className="bg-[#141C2B]/50 border border-white/5 rounded-xl p-6 space-y-4">
               <div className="flex items-center justify-between text-white/60">
                  <div className="flex items-center gap-3">
                     <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                     <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">PREVIEW</h2>
                  </div>
                  <span className="text-[8px] font-black bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">{isVertical ? '9:16' : '16:9'}</span>
               </div>
               
               <div className="w-full aspect-video bg-black/40 rounded-lg overflow-hidden border border-white/5 relative flex items-center justify-center">
                  <div className="relative w-4/5 aspect-video border-[3px] border-white/5 rounded shadow-2xl opacity-40 group-hover:opacity-100 transition-opacity overflow-hidden flex flex-col" style={{ backgroundColor: currentTheme.bg }}>
                     <div className="w-full h-1 bg-indigo-500/30"></div>
                     <div className="flex-grow p-3 flex flex-col gap-2">
                        <div className="w-4/5 h-1 bg-white/10 rounded-full"></div>
                        <div className="w-2/3 h-1 bg-white/10 rounded-full"></div>
                        <div className="mt-auto grid grid-cols-2 gap-2">
                           <div className="h-6 bg-white/5 border border-white/5 rounded"></div>
                           <div className="h-6 bg-white/10 border border-white/10 rounded" style={{ backgroundColor: currentTheme.accent + '20' }}></div>
                        </div>
                     </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-4 text-center">
                     <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Preview logic ready</p>
                  </div>
               </div>
            </div>

            {/* GENERATE BUTTON */}
            <button
               onClick={handleStartSimulation}
               disabled={!canStart}
               className={`w-full py-5 rounded-xl font-black uppercase text-xs tracking-[0.4em] transition-all shadow-xl group flex items-center justify-center gap-3 active:scale-[0.98]
               ${canStart
                   ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/10'
                   : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed shadow-none'}`}
            >
               <svg className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${canStart ? 'text-white' : 'text-white/10'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
               Generate & Launch Studio
            </button>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[9px] font-black text-center uppercase tracking-widest animate-fade-in shadow-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUploader;
