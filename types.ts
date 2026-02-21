
export interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  imageUrl?: string;
  timeLimit?: number; // In seconds
}

export interface UserAnswer {
  questionId: number;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean;
  timeSpent: number;
}

export enum AppPhase {
  UPLOAD = 'UPLOAD',
  QUIZ = 'QUIZ',
  RESULT = 'RESULT'
}

export type LayoutMode = 'LANDSCAPE' | 'PORTRAIT';

export interface QuizConfig {
  isTimed: boolean;
  title: string;
  isAutomatic: boolean;
  autoTimeLimit: number;
  recordSession: boolean;
  layoutMode: LayoutMode;
  themeColor: string;
  enableSound: boolean;
  enableTTS: boolean;
}
