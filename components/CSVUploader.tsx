
import React, { useState, useRef } from 'react';
import { Question, QuizConfig, LayoutMode } from '../types.ts';
import { speakText } from '../services/geminiTTS.ts';
import { SoundEngine } from '../utils/SoundEngine.ts';

interface CSVUploaderProps {
  onQuestionsLoaded: (questions: Question[], config: QuizConfig) => void;
}

const THEME_COLORS = [
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Fuchsia', value: '#C026D3' },
  { name: 'Rose', value: '#E11D48' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Black', value: '#000000' },
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
  const [themeColor, setThemeColor] = useState('#4F46E5');
  const [enableSound, setEnableSound] = useState(true);
  const [enableTTS, setEnableTTS] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [isTestingTTS, setIsTestingTTS] = useState(false);
  const [withPicture, setWithPicture] = useState(false);

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
      themeColor,
      enableSound,
      enableTTS,
      withPicture
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

              <div className="p-4 bg-[#1A2333] rounded-full border border-white/5 shadow-inner">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-3 px-2">Brand Accent Color</p>
                <div className="flex items-center gap-2 px-1">
                  {THEME_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setThemeColor(c.value)}
                      className={`w-8 h-8 rounded-full transition-all hover:scale-110 flex-shrink-0 ${themeColor === c.value ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1A2333] scale-110' : 'ring-1 ring-white/20'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
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

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-6 py-4 bg-[#1A2333] border border-white/5 rounded-full shadow-inner">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/80">Auto-Advance</span>
                  <button onClick={() => setIsAutomatic(!isAutomatic)} className={`w-12 h-6 rounded-full relative transition-colors border ${isAutomatic ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isAutomatic ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                  </button>
                </div>

                {isAutomatic && (
                  <div className="px-6 py-2">
                    <input type="range" min="5" max="60" step="5" value={autoTimeLimit} onChange={(e) => setAutoTimeLimit(parseInt(e.target.value))} className="w-full h-1.5 bg-[#0B1A2C] rounded-lg appearance-none cursor-pointer accent-indigo-400" />
                    <p className="text-right text-[10px] font-bold text-indigo-400 mt-2">{autoTimeLimit}s per Slide</p>
                  </div>
                )}

                <div className="flex items-center justify-between px-6 py-4 bg-[#1A2333] border border-white/5 rounded-full shadow-inner">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/80">Studio SFX</span>
                  <button onClick={() => setEnableSound(!enableSound)} className={`w-12 h-6 rounded-full relative transition-colors border ${enableSound ? 'bg-indigo-500 border-indigo-400' : 'bg-transparent border-white/20'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enableSound ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between px-6 py-4 bg-[#1A2333] border border-white/5 rounded-full shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">AI Auto-Reader</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">ElevenLabs TTS</span>
                  </div>
                  <button onClick={() => setEnableTTS(!enableTTS)} className={`w-12 h-6 rounded-full relative transition-colors border ${enableTTS ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enableTTS ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                  </button>
                </div>

                {enableTTS && (
                  <div className="px-6 py-1">
                    <button
                      onClick={async () => {
                        setIsTestingTTS(true);
                        SoundEngine.init();
                        const data = await speakText("Testing the AI Auto-Reader. If you hear this, the system is working correctly.");
                        if (data) SoundEngine.playBase64Audio(data);
                        setIsTestingTTS(false);
                      }}
                      disabled={isTestingTTS}
                      className="text-[9px] font-bold uppercase tracking-widest text-indigo-300 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isTestingTTS ? (
                        <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                      )}
                      <span>{isTestingTTS ? 'Testing...' : 'Test Reader Connection'}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between px-6 py-4 bg-[#1A2333] border border-white/5 rounded-full shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">With Picture</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Show image (1:1)</span>
                  </div>
                  <button onClick={() => setWithPicture(!withPicture)} className={`w-12 h-6 rounded-full relative transition-colors border ${withPicture ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${withPicture ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between px-6 py-4 bg-[#1A2333] border border-white/5 rounded-full shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">Studio Record</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">WebM Output</span>
                  </div>
                  <button onClick={() => setRecordSession(!recordSession)} className={`w-12 h-6 rounded-full relative transition-colors border ${recordSession ? 'bg-white/20 border-white/10' : 'bg-transparent border-white/20'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${recordSession ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-0.5 bg-white/50'}`} />
                  </button>
                </div>
                {recordSession && (
                  <div className="px-6 py-3 bg-rose-500/5 rounded-[1.5rem] border border-rose-500/10 mt-1">
                    <p className="text-[9px] font-bold text-rose-300/80 uppercase tracking-widest leading-relaxed">
                      ⚠️ Important: Select <span className="text-white border-b border-white/50">"This Tab"</span> in the browser popup to enable auto-cropping.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DATA & LAUNCH */}
          <div className="flex flex-col h-full space-y-10">
            <div className="flex-grow space-y-5">
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
