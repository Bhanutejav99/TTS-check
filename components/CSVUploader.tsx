
import React, { useState, useRef } from 'react';
import { Question, QuizConfig, LayoutMode, ThemeOption } from '../types.ts';
import { speakText } from '../services/elevenLabsTTS.ts';
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
  const [withPicture, setWithPicture] = useState(false);
  const [optionsOff, setOptionsOff] = useState(false);
  const [addIntroOutro, setAddIntroOutro] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [revealImageWithAnswer, setRevealImageWithAnswer] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState('tQHPlZCaA3Oe1X8BqFIp');

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
      addIntroOutro,
      isVertical,
      revealImageWithAnswer
    });
  };

  const canStart = testTitle.trim() !== '' && loadedQuestions !== null;

  return (
    <div className="w-full h-full min-h-screen bg-[#0E1521] flex items-center justify-center p-4">
      <div className="w-full max-w-[1200px] bg-[#141C2B] rounded-[2rem] border border-white/5 p-8 md:p-12 shadow-2xl relative overflow-hidden">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-12 relative z-10">

          {/* LEFT COLUMN: CONFIGURATION */}
          <div className="space-y-10">

            {/* 01 Project Identity */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-lg">01</span>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Project Identity</span>
              </div>
              <input
                type="text"
                placeholder="Project Title (e.g. History Quiz #1)"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full py-5 px-6 bg-[#1A2333] border border-white/5 rounded-full focus:border-indigo-500 focus:bg-white/5 transition-all outline-none text-xl font-bold text-white placeholder:text-white/20 shadow-inner"
              />
            </div>

            {/* 02 Branding & Theme */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-xl bg-[#0B1A2C] text-white flex items-center justify-center font-bold text-sm border border-white/10">02</span>
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Branding & Theme</span>
              </div>

              <div className="p-4 bg-[#1A2333] rounded-[1.5rem] border border-white/5 shadow-inner">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-3 px-2">Select Engine Theme</p>
                <div className="flex flex-wrap gap-3 px-1">
                  {QUIZ_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedThemeId(theme.id)}
                      className={`relative overflow-hidden rounded-xl h-14 flex-1 min-w-[30%] transition-all ${selectedThemeId === theme.id ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1A2333] scale-[1.02]' : 'ring-1 ring-white/10 hover:ring-white/30'}`}
                      style={{ backgroundColor: theme.bg }}
                      title={theme.name}
                    >
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                         <div className="w-4 h-4 rounded-full border border-white/20 mb-1" style={{ backgroundColor: theme.accent }}></div>
                         <span className="text-[8px] font-black uppercase text-white/90 tracking-widest leading-none drop-shadow-md">{theme.name.split(' ')[0]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 03 Engine Logic */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-xl bg-[#0B1A2C] text-white flex items-center justify-center font-bold text-sm border border-white/10">03</span>
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Engine Logic</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Auto-Advance Block */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between h-full px-6 py-4 bg-[#1A2333] border border-white/5 rounded-[1.5rem] shadow-inner">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">Auto-Advance</span>
                    <button onClick={() => setIsAutomatic(!isAutomatic)} className={`w-12 h-6 rounded-full relative transition-colors border shrink-0 ${isAutomatic ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isAutomatic ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                    </button>
                  </div>
                  {isAutomatic && (
                    <div className="px-4 py-3 bg-[#1A2333]/50 border border-white/5 rounded-[1.2rem]">
                      <input type="range" min="5" max="60" step="5" value={autoTimeLimit} onChange={(e) => setAutoTimeLimit(parseInt(e.target.value))} className="w-full h-1.5 bg-[#0B1A2C] rounded-lg appearance-none cursor-pointer accent-indigo-400" />
                      <p className="text-right text-[10px] font-bold text-indigo-400 mt-2">{autoTimeLimit}s per Slide</p>
                    </div>
                  )}
                </div>

                {/* Studio SFX Block */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between h-full px-6 py-4 bg-[#1A2333] border border-white/5 rounded-[1.5rem] shadow-inner">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">Studio SFX</span>
                    <button onClick={() => setEnableSound(!enableSound)} className={`w-12 h-6 rounded-full relative transition-colors border shrink-0 ${enableSound ? 'bg-indigo-500 border-indigo-400' : 'bg-transparent border-white/20'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enableSound ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                    </button>
                  </div>
                </div>

                {/* AI Auto-Reader Block (Spans full width if expanded) */}
                <div className={`flex flex-col gap-2 ${enableTTS ? 'md:col-span-2' : ''}`}>
                  <div className="flex items-center justify-between px-6 py-4 bg-[#1A2333] border border-white/5 rounded-[1.5rem] shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">AI Auto-Reader</span>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">ElevenLabs TTS</span>
                    </div>
                    <button onClick={() => setEnableTTS(!enableTTS)} className={`w-12 h-6 rounded-full relative transition-colors border shrink-0 ${enableTTS ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enableTTS ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                    </button>
                  </div>
                  
                  {enableTTS && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between px-6 py-3 bg-[#1A2333]/50 border border-white/5 rounded-[1.2rem]">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Voice Persona</span>
                          <select 
                            value={selectedVoiceId}
                            onChange={(e) => setSelectedVoiceId(e.target.value)}
                            className="bg-[#0B1A2C] text-white text-xs font-bold py-2 px-3 rounded-lg border border-white/10 outline-none w-full"
                          >
                            {ELEVENLABS_VOICES.map(voice => (
                              <option key={voice.id} value={voice.id}>{voice.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex items-center px-4 py-3 bg-[#1A2333]/50 border border-white/5 rounded-[1.2rem]">
                        <button
                          onClick={async () => {
                            setIsTestingTTS(true);
                            SoundEngine.init();
                            const data = await speakText("Testing the AI Auto-Reader.", selectedVoiceId);
                            if (data) SoundEngine.playBase64Audio(data);
                            setIsTestingTTS(false);
                          }}
                          disabled={isTestingTTS}
                          className="w-full h-full text-[9px] font-bold uppercase tracking-widest text-indigo-300 hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isTestingTTS ? (
                            <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                          )}
                          <span>{isTestingTTS ? 'Testing...' : 'Test Connection'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Skip Options Block */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between h-full px-6 py-4 bg-[#1A2333] border border-white/5 rounded-[1.5rem] shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">Skip Options TTS</span>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Save Credits</span>
                    </div>
                    <button onClick={() => setOptionsOff(!optionsOff)} className={`w-12 h-6 rounded-full relative transition-colors border shrink-0 ${optionsOff ? 'bg-rose-500/20 border-rose-500/30' : 'bg-transparent border-white/20'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${optionsOff ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)] bg-rose-400' : 'left-0.5 bg-white/50'}`} />
                    </button>
                  </div>
                </div>

                {/* Cinematic Slides Block */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between h-full px-6 py-4 bg-[#1A2333] border border-white/5 rounded-[1.5rem] shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">Cinematic Slides</span>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Intro & Outro</span>
                    </div>
                    <button onClick={() => setAddIntroOutro(!addIntroOutro)} className={`w-12 h-6 rounded-full relative transition-colors border shrink-0 ${addIntroOutro ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${addIntroOutro ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                    </button>
                  </div>
                </div>

                {/* Canvas Format Block */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between h-full px-6 py-4 bg-[#1A2333] border border-white/5 rounded-[1.5rem] shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">Canvas Format</span>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">{isVertical ? 'V/9:16 (Shorts)' : 'H/16:9 (Desktop)'}</span>
                    </div>
                    <button onClick={() => setIsVertical(!isVertical)} className={`w-12 h-6 rounded-full relative transition-colors border shrink-0 ${isVertical ? 'bg-fuchsia-500/20 border-fuchsia-500/40' : 'bg-transparent border-white/20'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isVertical ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)] bg-fuchsia-400' : 'left-0.5 bg-white/50'}`} />
                    </button>
                  </div>
                </div>

                {/* With Picture Block */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between h-full px-6 py-4 bg-[#1A2333] border border-white/5 rounded-[1.5rem] shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">With Picture</span>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Show Image (1:1/4:3)</span>
                    </div>
                    <button onClick={() => setWithPicture(!withPicture)} className={`w-12 h-6 rounded-full relative transition-colors border shrink-0 ${withPicture ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${withPicture ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                    </button>
                  </div>

                  {withPicture && (
                    <div className="flex items-center justify-between px-6 py-3 bg-white/5 border border-white/10 rounded-[1.2rem] animate-fade-in">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Sync Reveal</span>
                        <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Image hits with answer</span>
                      </div>
                      <button onClick={() => setRevealImageWithAnswer(!revealImageWithAnswer)} className={`w-10 h-5 rounded-full relative transition-colors border shrink-0 ${revealImageWithAnswer ? 'bg-emerald-500/30 border-emerald-500/50' : 'bg-transparent border-white/20'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${revealImageWithAnswer ? 'left-5 shadow-[0_0_10px_rgba(16,185,129,0.5)] bg-emerald-400' : 'left-0.5 bg-white/50'}`} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Studio Record Block */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between h-full px-6 py-4 bg-[#1A2333] border border-white/5 rounded-[1.5rem] shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">Studio Record</span>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">WebM Output</span>
                    </div>
                    <button onClick={() => setRecordSession(!recordSession)} className={`w-12 h-6 rounded-full relative transition-colors border shrink-0 ${recordSession ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${recordSession ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                    </button>
                  </div>
                  {recordSession && (
                    <div className="px-4 py-3 bg-rose-500/5 rounded-[1.2rem] border border-rose-500/10">
                      <p className="text-[9px] font-bold text-rose-300/80 uppercase tracking-widest leading-relaxed">
                        ⚠️ Select <span className="text-white border-b border-white/50">"This Tab"</span> in popup to auto-crop.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DATA & LAUNCH */}
          <div className="flex flex-col h-full space-y-8">
            <div className="flex flex-col space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-400 text-[#0E1521] flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(52,211,153,0.3)]">04</span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Data Ingestion</span>
              </div>

              <div className="bg-[#1A2333] border border-white/5 rounded-full p-1.5 flex gap-1 shadow-inner">
                <button onClick={() => setActiveTab('upload')} className={`flex-1 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-[#0B1A2C] text-white shadow-md border border-white/5' : 'text-white/30 hover:text-white/60'}`}>CSV File</button>
                <button onClick={() => setActiveTab('paste')} className={`flex-1 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'paste' ? 'bg-[#0B1A2C] text-white shadow-md border border-white/5' : 'text-white/30 hover:text-white/60'}`}>Quick Paste</button>
              </div>

              <div className="relative group flex-grow h-[280px]">
                {activeTab === 'upload' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] transition-all cursor-pointer ${loadedQuestions ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-white/30 bg-[#1A2333]/50'}`}
                  >
                    {loadedQuestions ? (
                      <div className="text-center">
                        <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg></div>
                        <p className="text-lg font-bold text-emerald-400 uppercase tracking-widest">{loadedQuestions.length} Questions</p>
                        <p className="text-[10px] text-emerald-400/50 uppercase tracking-widest mt-2">Ready for broadcast</p>
                      </div>
                    ) : (
                      <div className="text-center opacity-40 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-[#0B1A2C] border border-white/10 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-inner"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Click to Upload</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                  </div>
                ) : (
                  <div className="relative h-full">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste your CSV content here..."
                      className="w-full h-full p-8 bg-[#1A2333]/80 border border-white/5 rounded-[2.5rem] focus:border-indigo-500/50 focus:bg-[#1A2333] transition-all outline-none resize-none font-mono text-[11px] leading-max text-white/70 placeholder:text-white/20 shadow-inner"
                    />
                    <button
                      onClick={handlePasteProcess}
                      className="absolute bottom-6 right-6 px-6 py-2.5 bg-[#0B1A2C] text-white text-[9px] font-bold uppercase tracking-widest rounded-full hover:bg-white/10 transition-colors border border-white/10"
                    >
                      Process Text
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE PREVIEW MODULE */}
            <div className="flex-grow flex flex-col justify-end pb-2">
              <div className="bg-[#1A2333]/50 border border-white/5 rounded-[2rem] p-5 shadow-inner backdrop-blur-sm">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center bg-white/10" style={{ backgroundColor: (QUIZ_THEMES.find(t => t.id === selectedThemeId) || QUIZ_THEMES[0]).accent }}></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Output Preview</span>
                   </div>
                   <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 bg-[#0B1A2C] border border-white/5 rounded-full text-white/40">{isVertical ? 'V/9:16' : 'H/16:9'}</span>
                 </div>
                 
                 <div className="w-full flex items-center justify-center p-4 bg-[#0B1A2C]/50 rounded-[1.5rem] border border-white/5 h-[160px] overflow-hidden shadow-inner">
                    <div 
                      className={`relative flex flex-col shadow-[0_10px_20px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden transition-all duration-700 ${isVertical ? 'aspect-[9/16] h-[130px] w-auto border-2' : 'aspect-video w-[200px] border-[3px]'}`}
                      style={{ backgroundColor: (QUIZ_THEMES.find(t => t.id === selectedThemeId) || QUIZ_THEMES[0]).bg, borderColor: (QUIZ_THEMES.find(t => t.id === selectedThemeId) || QUIZ_THEMES[0]).card }}
                    >
                      {/* Top Progress Bar */}
                      <div className="w-full h-1 bg-white/10 shrink-0">
                         <div className="h-full w-1/3 transition-colors duration-500" style={{ backgroundColor: (QUIZ_THEMES.find(t => t.id === selectedThemeId) || QUIZ_THEMES[0]).accent }}></div>
                      </div>

                      <div className={`p-2 flex-grow flex ${withPicture ? (isVertical ? 'flex-col items-center justify-center gap-1.5' : 'flex-row items-center justify-center gap-2.5') : 'flex-col items-center justify-center'} transition-all`}>
                         
                         {/* Fake Image (Vertical) */}
                         {withPicture && isVertical && (
                           <div className="w-4/5 aspect-[4/3] rounded-sm bg-white/10 shrink-0 border border-white/5 shadow-sm"></div>
                         )}

                         {/* Fake Text */}
                         <div className={`flex flex-col gap-1 w-full items-center justify-center ${withPicture && !isVertical ? 'flex-1' : ''}`}>
                            <div className="w-4/5 h-1.5 bg-white/20 rounded-full"></div>
                            <div className="w-3/5 h-1.5 bg-white/20 rounded-full"></div>
                         </div>

                         {/* Fake Image (Landscape) */}
                         {withPicture && !isVertical && (
                           <div className="w-10 h-10 aspect-square rounded-sm shrink-0 bg-white/10 border border-white/5 shadow-sm"></div>
                         )}

                      </div>

                      {/* Fake Options */}
                      <div className={`p-1.5 shrink-0 grid ${isVertical ? 'grid-cols-1 gap-0.5' : 'grid-cols-2 gap-1.5'} w-full transition-all`}>
                         {[1, 2].map(i => (
                           <div key={`opt-${i}`} className={`flex items-center gap-1.5 px-1.5 rounded-sm bg-white border border-transparent shadow-sm ${isVertical ? 'h-[12px]' : 'h-[16px]'}`}>
                             <div className={`shrink-0 rounded-[2px] bg-slate-200 ${isVertical ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'}`}></div>
                             <div className="h-0.5 bg-slate-200 rounded-full w-2/3"></div>
                           </div>
                         ))}
                         {[3, 4].map(i => (
                           <div key={`opt-${i}`} className={`flex items-center gap-1.5 px-1.5 rounded-sm shadow-sm ${isVertical ? 'h-[12px]' : 'h-[16px]'}`} style={{ backgroundColor: i === 3 ? (QUIZ_THEMES.find(t => t.id === selectedThemeId) || QUIZ_THEMES[0]).accent : 'white' }}>
                             <div className={`shrink-0 rounded-[2px] bg-white ${isVertical ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'}`}></div>
                             <div className="h-0.5 bg-white/30 rounded-full w-2/3"></div>
                           </div>
                         ))}
                      </div>

                    </div>
                 </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleStartSimulation}
                disabled={!canStart}
                className={`w-full py-6 rounded-full font-bold uppercase text-xs tracking-[0.4em] transition-all shadow-xl
                ${canStart
                    ? 'bg-[#1A2333] text-white hover:bg-white/10 border border-white/10 hover:border-white/20'
                    : 'bg-[#1A2333]/50 text-white/10 border border-white/5 cursor-not-allowed shadow-none'}`}
              >
                Launch Studio
              </button>

              {error && (
                <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-[9px] font-bold text-center uppercase tracking-widest">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUploader;
