
import { Question } from './types.ts';

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "On which date is the Union Budget typically presented in India?",
    optionA: "1st February",
    optionB: "5th March",
    optionC: "31st July",
    optionD: "26th January",
    correctAnswer: "A",
    imageUrl: "https://picsum.photos/seed/budget/800/500",
    timeLimit: 15
  },
  {
    id: 2,
    question: "Which programming language is primarily used for Android app development?",
    optionA: "Swift",
    optionB: "Kotlin",
    optionC: "Objective-C",
    optionD: "Ruby",
    correctAnswer: "B",
    imageUrl: "https://picsum.photos/seed/android/800/500",
    timeLimit: 20
  },
  {
    id: 3,
    question: "Which planet in our solar system is known as the 'Red Planet'?",
    optionA: "Venus",
    optionB: "Mars",
    optionC: "Jupiter",
    optionD: "Saturn",
    correctAnswer: "B",
    imageUrl: "https://picsum.photos/seed/mars/800/500",
    timeLimit: 12
  },
  {
    id: 4,
    question: "What is the chemical symbol for the element Gold?",
    optionA: "Gd",
    optionB: "Ag",
    optionC: "Au",
    optionD: "Fe",
    correctAnswer: "C",
    imageUrl: "https://picsum.photos/seed/gold/800/500",
    timeLimit: 10
  },
  {
    id: 5,
    question: "In which year did the Titanic sink in the North Atlantic Ocean?",
    optionA: "1912",
    optionB: "1905",
    optionC: "1921",
    optionD: "1898",
    correctAnswer: "A",
    imageUrl: "https://picsum.photos/seed/ship/800/500",
    timeLimit: 15
  },
  {
    id: 6,
    question: "Who is known as the father of Modern Physics?",
    optionA: "Isaac Newton",
    optionB: "Albert Einstein",
    optionC: "Galileo Galilei",
    optionD: "Niels Bohr",
    correctAnswer: "B",
    imageUrl: "https://picsum.photos/seed/physics/800/500",
    timeLimit: 20
  },
  {
    id: 7,
    question: "Which is the largest ocean on planet Earth?",
    optionA: "Atlantic Ocean",
    optionB: "Indian Ocean",
    optionC: "Arctic Ocean",
    optionD: "Pacific Ocean",
    correctAnswer: "D",
    imageUrl: "https://picsum.photos/seed/ocean/800/500",
    timeLimit: 15
  },
  {
    id: 8,
    question: "The Great Wall of China was primarily built to protect against which invaders?",
    optionA: "The Romans",
    optionB: "The Mongols",
    optionC: "The Persians",
    optionD: "The Vikings",
    correctAnswer: "B",
    imageUrl: "https://picsum.photos/seed/china/800/500",
    timeLimit: 18
  },
  {
    id: 9,
    question: "Which organ in the human body is responsible for pumping blood?",
    optionA: "Lungs",
    optionB: "Brain",
    optionC: "Heart",
    optionD: "Liver",
    correctAnswer: "C",
    imageUrl: "https://picsum.photos/seed/heart/800/500",
    timeLimit: 10
  },
  {
    id: 10,
    question: "What is the square root of 144?",
    optionA: "10",
    optionB: "11",
    optionC: "12",
    optionD: "14",
    correctAnswer: "C",
    imageUrl: "https://picsum.photos/seed/math/800/500",
    timeLimit: 15
  }
];

export const DEFAULT_TIME_LIMIT = 20;
