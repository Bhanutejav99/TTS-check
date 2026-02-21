
import React, { useState, useRef } from 'react';
import { Question, QuizConfig, LayoutMode } from '../types.ts';

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
          if (h.includes('image')) q.imageUrl = vals[i];
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
      enableTTS
    });
  };

  const canStart = testTitle.trim() !== '' && loadedQuestions !== null;

  return (
    <div className="max-w-7xl mx-auto my-auto px-4 py-12 lg:py-20 animate-fade-in relative">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter">Studio Lab</h2>
        <p className="text-white/50 text-xl md:text-2xl font-black tracking-tight max-w-2xl mx-auto italic opacity-70">
          Configure your broadcast parameters.
        </p>
      </div>

      <div className="glass-ui p-8 md:p-16 rounded-[4rem] shadow-2xl relative overflow-hidden border border-white/10">
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 relative z-10">
          
          {/* LEFT COLUMN: CONFIGURATION */}
          <div className="space-y-12">
            
            {/* Identity */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg">01</span>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em]">Project Identity</span>
              </div>
              <input 
                type="text" 
                placeholder="Project Title (e.g. History Quiz #1)"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full p-6 bg-white/5 border-2 border-white/10 rounded-[2rem] focus:border-indigo-500 focus:bg-white/10 transition-all outline-none text-2xl font-black text-white placeholder:text-white/20"
              />
            </div>

            {/* Branding */}
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-[#0B2545] text-white flex items-center justify-center font-black shadow-lg border border-white/10">02</span>
                <span className="text-xs font-black text-white/50 uppercase tracking-[0.4em]">Branding & Theme</span>
              </div>
              
              {/* Color Picker */}
              <div className="p-6 bg-white/5 rounded-[2rem] border-2 border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4">Brand Accent Color</p>
                <div className="flex flex-wrap gap-3">
                  {THEME_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setThemeColor(c.value)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${themeColor === c.value ? 'ring-4 ring-offset-2 ring-white/20 scale-110' : ''}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Mechanics */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-[#0B2545] text-white flex items-center justify-center font-black shadow-lg border border-white/10">03</span>
                <span className="text-xs font-black text-white/50 uppercase tracking-[0.4em]">Engine Logic</span>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest text-white/80">Auto-Advance</span>
                  <button onClick={() => setIsAutomatic(!isAutomatic)} className={`w-12 h-7 rounded-full relative transition-colors ${isAutomatic ? 'bg-emerald-500' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${isAutomatic ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                
                {isAutomatic && (
                   <div className="px-5 py-3">
                      <input type="range" min="5" max="60" step="5" value={autoTimeLimit} onChange={(e) => setAutoTimeLimit(parseInt(e.target.value))} className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                      <p className="text-right text-[10px] font-bold text-emerald-400 mt-2">{autoTimeLimit}s per Slide</p>
                   </div>
                )}

                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest text-white/80">Studio SFX</span>
                  <button onClick={() => setEnableSound(!enableSound)} className={`w-12 h-7 rounded-full relative transition-colors ${enableSound ? 'bg-indigo-600' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${enableSound ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/10">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/80 block">AI Auto-Reader</span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Gemini TTS</span>
                  </div>
                  <button onClick={() => setEnableTTS(!enableTTS)} className={`w-12 h-7 rounded-full relative transition-colors ${enableTTS ? 'bg-emerald-500' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${enableTTS ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/10">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/80 block">Studio Record</span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">WebM Output</span>
                  </div>
                  <button onClick={() => setRecordSession(!recordSession)} className={`w-12 h-7 rounded-full relative transition-colors ${recordSession ? 'bg-rose-500' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${recordSession ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                {recordSession && (
                   <div className="px-5 py-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 mx-2">
                      <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest leading-relaxed">
                        ⚠️ Important: Select <span className="text-white border-b border-white/50">"This Tab"</span> in the browser popup to enable auto-cropping.
                      </p>
                   </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DATA & LAUNCH */}
          <div className="space-y-12 flex flex-col h-full">
            <div className="flex-grow space-y-6">
               <div className="flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg">04</span>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em]">Data Ingestion</span>
              </div>
              
              <div className="bg-white/5 border-2 border-white/10 rounded-[3rem] p-2 flex gap-2">
                <button onClick={() => setActiveTab('upload')} className={`flex-1 py-3 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-[#0B2545] text-white shadow-lg border border-white/10' : 'text-white/40 hover:text-white'}`}>CSV File</button>
                <button onClick={() => setActiveTab('paste')} className={`flex-1 py-3 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'paste' ? 'bg-[#0B2545] text-white shadow-lg border border-white/10' : 'text-white/40 hover:text-white'}`}>Quick Paste</button>
              </div>

              <div className="relative group">
                {activeTab === 'upload' ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full aspect-video flex flex-col items-center justify-center border-4 border-dashed rounded-[3rem] transition-all cursor-pointer ${loadedQuestions ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-indigo-400 bg-white/5'}`}
                  >
                     {loadedQuestions ? (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg></div>
                          <p className="text-xl font-black text-emerald-400">{loadedQuestions.length} Questions Ready</p>
                        </div>
                     ) : (
                        <div className="text-center opacity-50 group-hover:opacity-100 transition-opacity">
                           <div className="w-12 h-12 bg-white/10 rounded-xl mx-auto mb-4 flex items-center justify-center"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                           <p className="text-xs font-black uppercase tracking-widest text-white">Click to Upload</p>
                        </div>
                     )}
                     <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                  </div>
                ) : (
                  <div className="relative">
                    <textarea 
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste your CSV content here..."
                      className="w-full aspect-video p-8 bg-white/5 border-2 border-white/10 rounded-[3rem] focus:border-indigo-500 focus:ring-4 ring-indigo-500/20 transition-all outline-none resize-none font-mono text-xs text-white placeholder:text-white/20"
                    />
                    <button 
                      onClick={handlePasteProcess}
                      className="absolute bottom-6 right-6 px-6 py-2 bg-[#0B2545] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-colors border border-white/10"
                    >
                      Process Text
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={handleStartSimulation}
              disabled={!canStart}
              className={`w-full py-10 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.5em] transition-all shadow-xl
              ${canStart 
                ? 'bg-white text-[#04192c] hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-white/10 text-white/20 cursor-not-allowed shadow-none'}`}
            >
              Launch Studio
            </button>

             {error && (
              <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-3xl text-[10px] font-black text-center uppercase tracking-widest">
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
