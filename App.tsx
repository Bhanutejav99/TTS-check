
import React, { useState } from 'react';
import { AppPhase, Question, UserAnswer, QuizConfig } from './types.ts';
import { SAMPLE_QUESTIONS } from './constants.tsx';
import CSVUploader from './components/CSVUploader.tsx';
import QuizInterface from './components/QuizInterface.tsx';
import ResultView from './components/ResultView.tsx';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.UPLOAD);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [finalAnswers, setFinalAnswers] = useState<UserAnswer[]>([]);
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);

  const handleStartQuiz = (loadedQuestions: Question[], config: QuizConfig) => {
    setQuestions(loadedQuestions.length > 0 ? loadedQuestions : SAMPLE_QUESTIONS);
    setQuizConfig(config);
    setPhase(AppPhase.QUIZ);
  };

  const handleFinishQuiz = (answers: UserAnswer[]) => {
    setFinalAnswers(answers);
    setPhase(AppPhase.RESULT);
  };

  const handleRestart = () => {
    setPhase(AppPhase.UPLOAD);
    setQuestions([]);
    setFinalAnswers([]);
    setQuizConfig(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0E1521]">
      {/* Header hidden during upload phase to let the new landing page shine */}
      {phase !== AppPhase.UPLOAD && phase !== AppPhase.QUIZ && (
        <header className="bg-[#141C2B]/80 backdrop-blur-xl border-b border-white/5 py-4 px-8 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-[#04192c] font-bold text-lg">M</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">MockMaster</h1>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Creator Studio</span>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-6">
            {[
              { phase: AppPhase.UPLOAD, label: 'Setup' },
              { phase: AppPhase.QUIZ, label: 'Broadcast' },
              { phase: AppPhase.RESULT, label: 'Review' }
            ].map((step, idx) => (
              <div key={step.phase} className="flex items-center gap-3">
                <span className={`text-[11px] font-bold tracking-widest uppercase transition-colors duration-300 ${phase === step.phase ? 'text-emerald-400' : 'text-white/30'}`}>
                  {step.label}
                </span>
                {idx < 2 && <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>}
              </div>
            ))}
          </nav>
        </header>
      )}

      <main className="flex-grow flex flex-col">
        {phase === AppPhase.UPLOAD && <CSVUploader onQuestionsLoaded={handleStartQuiz} />}
        {phase === AppPhase.QUIZ && quizConfig && (
          <QuizInterface
            questions={questions}
            config={quizConfig}
            onFinish={handleFinishQuiz}
            onExit={handleRestart}
          />
        )}
        {phase === AppPhase.RESULT && quizConfig && <ResultView questions={questions} answers={finalAnswers} theme={quizConfig.theme} onRestart={handleRestart} />}
      </main>

      {phase !== AppPhase.UPLOAD && phase !== AppPhase.QUIZ && (
        <footer className="py-6 px-8 flex justify-between items-center border-t border-white/5 bg-[#0E1521]">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Creator Engine &copy; 2026</p>
        </footer>
      )}
    </div>
  );
};

export default App;
