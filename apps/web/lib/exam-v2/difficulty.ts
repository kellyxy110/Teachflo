import type { AdaptiveState, DifficultyLevel } from "./types";

export function createInitialState(): AdaptiveState {
  return {
    currentDifficulty: "medium",
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    difficultyHistory: ["medium"],
    accuracyByDifficulty: {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 },
    },
    coveredSkills: [],
    answeredQuestionIds: [],
  };
}

export function adaptDifficulty(
  state: AdaptiveState,
  isCorrect: boolean,
  timeSpent: number,
  expectedTime: number
): AdaptiveState {
  const newState = { ...state };
  const diff = state.currentDifficulty;

  newState.accuracyByDifficulty = { ...state.accuracyByDifficulty };
  newState.accuracyByDifficulty[diff] = {
    correct: state.accuracyByDifficulty[diff].correct + (isCorrect ? 1 : 0),
    total: state.accuracyByDifficulty[diff].total + 1,
  };

  if (isCorrect) {
    newState.consecutiveCorrect = state.consecutiveCorrect + 1;
    newState.consecutiveWrong = 0;
  } else {
    newState.consecutiveWrong = state.consecutiveWrong + 1;
    newState.consecutiveCorrect = 0;
  }

  const timeRatio = timeSpent / expectedTime;
  const wasQuick = timeRatio < 0.5;
  const wasSlow = timeRatio > 1.5;

  let nextDifficulty = state.currentDifficulty;

  if (newState.consecutiveCorrect >= 3 || (newState.consecutiveCorrect >= 2 && wasQuick)) {
    nextDifficulty = increaseDifficulty(diff);
  } else if (newState.consecutiveWrong >= 2 || (newState.consecutiveWrong >= 1 && wasSlow)) {
    nextDifficulty = decreaseDifficulty(diff);
  }

  const totalAtLevel = newState.accuracyByDifficulty[diff].total;
  const correctAtLevel = newState.accuracyByDifficulty[diff].correct;
  if (totalAtLevel >= 3) {
    const accuracy = correctAtLevel / totalAtLevel;
    if (accuracy >= 0.8) nextDifficulty = increaseDifficulty(diff);
    else if (accuracy <= 0.3) nextDifficulty = decreaseDifficulty(diff);
  }

  newState.currentDifficulty = nextDifficulty;
  newState.difficultyHistory = [...state.difficultyHistory, nextDifficulty];

  return newState;
}

function increaseDifficulty(current: DifficultyLevel): DifficultyLevel {
  if (current === "easy") return "medium";
  if (current === "medium") return "hard";
  return "hard";
}

function decreaseDifficulty(current: DifficultyLevel): DifficultyLevel {
  if (current === "hard") return "medium";
  if (current === "medium") return "easy";
  return "easy";
}

export function getDifficultyMultiplier(difficulty: DifficultyLevel): number {
  return { easy: 0.7, medium: 1.0, hard: 1.4 }[difficulty];
}
