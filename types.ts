
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

export interface ThemeOption {
  id: string;
  name: string;
  bg: string;
  card: string;
  accent: string;
}

export interface QuizConfig {
  isTimed: boolean;
  title: string;
  isAutomatic: boolean;
  autoTimeLimit: number;
  recordSession: boolean;
  layoutMode: LayoutMode;
  theme: ThemeOption;
  enableSound: boolean;
  enableTTS: boolean;
  withPicture: boolean;
  optionsOff: boolean;
}
