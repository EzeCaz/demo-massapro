import { create } from 'zustand'

export type AppView = 'login' | 'setup' | 'dashboard' | 'admin' | 'shared'

interface AppState {
  currentView: AppView
  setCurrentView: (view: AppView) => void
  selectedScenarioId: string | null
  setSelectedScenarioId: (id: string | null) => void
  sharedToken: string | null
  setSharedToken: (token: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'login',
  setCurrentView: (view) => set({ currentView: view }),
  selectedScenarioId: null,
  setSelectedScenarioId: (id) => set({ selectedScenarioId: id }),
  sharedToken: null,
  setSharedToken: (token) => set({ sharedToken: token }),
}))
