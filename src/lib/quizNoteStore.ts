import { create } from 'zustand'

interface QuizNoteState {
  note: any
  setNote: (note: any) => void
  clearNote: () => void
}

export const useQuizNoteStore = create<QuizNoteState>((set) => ({
  note: null,
  setNote: (note) => set({ note }),
  clearNote: () => set({ note: null }),
}))
