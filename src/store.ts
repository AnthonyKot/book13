import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompletionEvidence {
  passedAt: string;
  attempts: number;
  hintsUsed: number;
}

interface CourseState {
  currentChapterId: string;
  codeSnippets: Record<string, string>;
  completions: Record<string, CompletionEvidence>;
  predictionSelections: Record<string, string>;
  checkedPredictions: Record<string, boolean>;
  hintsRevealed: Record<string, number>;
  attempts: Record<string, number>;
  setChapter: (id: string) => void;
  saveCodeSnippet: (chapterId: string, code: string) => void;
  resetCodeSnippet: (chapterId: string) => void;
  selectPrediction: (chapterId: string, optionId: string) => void;
  checkPrediction: (chapterId: string) => void;
  revealHint: (chapterId: string, hintCount: number) => void;
  recordAttempt: (chapterId: string) => void;
  recordCompletion: (chapterId: string) => void;
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set) => ({
      currentChapterId: 'ch1',
      codeSnippets: {},
      completions: {},
      predictionSelections: {},
      checkedPredictions: {},
      hintsRevealed: {},
      attempts: {},
      setChapter: (id) => set({ currentChapterId: id }),
      saveCodeSnippet: (chapterId, code) => set((state) => ({
        codeSnippets: { ...state.codeSnippets, [chapterId]: code },
      })),
      resetCodeSnippet: (chapterId) => set((state) => {
        const codeSnippets = { ...state.codeSnippets };
        delete codeSnippets[chapterId];
        return { codeSnippets };
      }),
      selectPrediction: (chapterId, optionId) => set((state) => ({
        predictionSelections: { ...state.predictionSelections, [chapterId]: optionId },
      })),
      checkPrediction: (chapterId) => set((state) => ({
        checkedPredictions: { ...state.checkedPredictions, [chapterId]: true },
      })),
      revealHint: (chapterId, hintCount) => set((state) => ({
        hintsRevealed: { ...state.hintsRevealed, [chapterId]: hintCount },
      })),
      recordAttempt: (chapterId) => set((state) => ({
        attempts: { ...state.attempts, [chapterId]: (state.attempts[chapterId] ?? 0) + 1 },
      })),
      recordCompletion: (chapterId) => set((state) => ({
        completions: {
          ...state.completions,
          [chapterId]: state.completions[chapterId] ?? {
            passedAt: new Date().toISOString(),
            attempts: state.attempts[chapterId] ?? 1,
            hintsUsed: state.hintsRevealed[chapterId] ?? 0,
          },
        },
      })),
    }),
    {
      name: 'go-shift-storage',
      version: 1,
    },
  ),
);
