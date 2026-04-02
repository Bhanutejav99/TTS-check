
import React from 'react';
import { Question, UserAnswer, ThemeOption } from '../types.ts';

interface ResultViewProps {
  questions: Question[];
  answers: UserAnswer[];
  theme: ThemeOption;
  onRestart: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ questions, answers, theme, onRestart }) => {
  const score = answers.filter(a => a.isCorrect).length;
  const percentage = Math.round((score / questions.length) * 100);
  const isPass = percentage >= 70;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20 animate-fade-in">
      <div className="bg-[var(--theme-bg)] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl shadow-black/50" style={{ '--theme-bg': theme.bg, '--theme-card': theme.card } as React.CSSProperties}>
        
        {/* Score Header */}
        <div className="bg-[var(--theme-card)] p-12 lg:p-24 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
          
          <div className="relative z-10">
            <div className={`inline-block px-6 py-2 rounded-full border mb-10 text-[10px] font-black uppercase tracking-[0.3em] 
              ${isPass ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              Assessment Summary
            </div>
            
            <h2 className="text-6xl md:text-8xl font-black text-white mb-12 tracking-tighter">
              {percentage}% <span className="text-white/30 text-4xl align-middle mx-2 font-normal">Score</span>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {[
                { label: 'Correct', value: score, color: 'text-emerald-400' },
                { label: 'Incorrect', value: questions.length - score, color: 'text-rose-400' },
                { label: 'Accuracy', value: `${percentage}%`, color: 'text-white' },
                { label: 'Items', value: questions.length, color: 'text-white/50' }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown Section */}
        <div className="p-8 lg:p-16 bg-[var(--theme-bg)]">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-white tracking-tight">Technical Review</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mastered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Needs Review</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const answer = answers.find(a => a.questionId === q.id);
              const correct = answer?.isCorrect;
              return (
                <div key={q.id} className="group bg-white/5 border border-white/5 rounded-2xl p-8 hover:bg-white/10 transition-all">
                  <div className="flex gap-8 items-start">
                    <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm
                      ${correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}
                    `}>
                      {idx + 1}
                    </div>
                    <div className="flex-grow">
                      <p className="text-xl font-bold text-white/90 mb-6 leading-loose" dangerouslySetInnerHTML={{ __html: q.question }} />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">Key (Correct Answer)</span>
                          <span className="text-sm font-bold text-white">{q[`option${q.correctAnswer}`]}</span>
                        </div>
                        <div className={`p-4 rounded-xl border ${correct ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                          <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${correct ? 'text-emerald-400' : 'text-rose-400'}`}>User Submission</span>
                          <span className={`text-sm font-bold ${correct ? 'text-emerald-100' : 'text-rose-100'}`}>
                            {answer?.selectedOption ? q[`option${answer.selectedOption}`] : 'Abstained'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-20 flex flex-col items-center">
            <div className="flex flex-col sm:flex-row gap-4 print:hidden">
              <button 
                onClick={() => window.print()} 
                className="px-12 py-5 bg-[var(--theme-card)] text-white border border-white/10 font-black text-sm rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest active:scale-95 shadow-xl flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </button>
              <button 
                onClick={onRestart} 
                className="px-12 py-5 bg-white text-[var(--theme-bg)] font-black text-sm rounded-2xl hover:bg-emerald-400 transition-all uppercase tracking-widest active:scale-95 shadow-2xl"
              >
                Start New Simulation
              </button>
            </div>
            <p className="mt-8 text-[9px] font-black text-white/20 uppercase tracking-[0.4em] print:hidden">Analytics Engine V2.0 • MockMaster</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultView;
