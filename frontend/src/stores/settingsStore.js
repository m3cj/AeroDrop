import { create } from 'zustand'
import api from '../lib/api'

const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null })
    try {
      const res = await api.get('/settings')
      set({ settings: res.data, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  updateSettings: async (updates) => {
    try {
      const res = await api.put('/settings', updates)
      set({ settings: res.data })
      return res.data
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  // Optimistic local update
  patchLocal: (updates) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...updates } : updates,
    })),
}))

export default useSettingsStore
