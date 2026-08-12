import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CourseState {
  currentChapterId: string;
  codeSnippets: Record<string, string>;
  completedChapters: Record<string, boolean>;
  setChapter: (id: string) => void;
  saveCodeSnippet: (chapterId: string, code: string) => void;
  markChapterCompleted: (id: string) => void;
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set) => ({
      currentChapterId: 'ch1',
      codeSnippets: {},
      completedChapters: {},
      setChapter: (id) => set({ currentChapterId: id }),
      saveCodeSnippet: (chapterId, code) => set((state) => ({
        codeSnippets: { ...state.codeSnippets, [chapterId]: code }
      })),
      markChapterCompleted: (id) => set((state) => ({
        completedChapters: { ...state.completedChapters, [id]: true }
      })),
    }),
    {
      name: 'book13-storage',
    }
  )
);
