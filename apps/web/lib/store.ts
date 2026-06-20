"use client";
import { create } from "zustand";

interface SessionStats {
  topicsCovered: number;
  questionsAnswered: number;
  correctAnswers: number;
}

interface LearningState {
  // Study Buddy
  studyMode: "explain" | "test" | "hint" | "step-by-step" | "review-mistakes";
  setStudyMode: (mode: LearningState["studyMode"]) => void;

  // Practice Arena
  activeGame: "math-sprint" | "concept-match" | "fix-answer" | "quiz-battle" | null;
  setActiveGame: (game: LearningState["activeGame"]) => void;
  gameScore: number;
  addGameScore: (pts: number) => void;
  resetGameScore: () => void;

  // Calculator
  calcOpen: boolean;
  setCalcOpen: (v: boolean) => void;

  // Session
  sessionStats: SessionStats;
  incrementTopic: () => void;
  logAnswer: (correct: boolean) => void;
  resetSession: () => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  studyMode: "explain",
  setStudyMode: (mode) => set({ studyMode: mode }),

  activeGame: null,
  setActiveGame: (game) => set({ activeGame: game }),
  gameScore: 0,
  addGameScore: (pts) => set((s) => ({ gameScore: s.gameScore + pts })),
  resetGameScore: () => set({ gameScore: 0 }),

  calcOpen: false,
  setCalcOpen: (v) => set({ calcOpen: v }),

  sessionStats: { topicsCovered: 0, questionsAnswered: 0, correctAnswers: 0 },
  incrementTopic: () =>
    set((s) => ({
      sessionStats: {
        ...s.sessionStats,
        topicsCovered: s.sessionStats.topicsCovered + 1,
      },
    })),
  logAnswer: (correct) =>
    set((s) => ({
      sessionStats: {
        ...s.sessionStats,
        questionsAnswered: s.sessionStats.questionsAnswered + 1,
        correctAnswers: s.sessionStats.correctAnswers + (correct ? 1 : 0),
      },
    })),
  resetSession: () =>
    set({
      sessionStats: { topicsCovered: 0, questionsAnswered: 0, correctAnswers: 0 },
    }),
}));
