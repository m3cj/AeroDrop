import { create } from 'zustand'
import api from '../lib/api'

const useMissionStore = create((set, get) => ({
  // Mission list
  missions: [],
  total: 0,
  loading: false,
  error: null,

  // Active mission (in flight or ready)
  activeMission: null,

  // Mission creator panel
  creatorOpen: false,
  creatorDest: null,  // { lat, lon, label }

  // Actions
  setCreatorOpen: (open) => set({ creatorOpen: open }),
  setCreatorDest: (dest) => set({ creatorDest: dest }),

  fetchMissions: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const res = await api.get('/missions', { params })
      set({
        missions: res.data.missions,
        total: res.data.total,
        loading: false,
      })
      // Find active mission
      const active = res.data.missions.find(
        (m) => ['READY', 'IN_FLIGHT', 'DELIVERED', 'RETURNING'].includes(m.status)
      )
      set({ activeMission: active || null })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  createMission: async (data) => {
    const res = await api.post('/missions', data)
    const mission = res.data
    set((state) => ({ missions: [mission, ...state.missions] }))
    return mission
  },

  validateMission: async (id) => {
    const res = await api.post(`/missions/${id}/validate`)
    const updated = res.data
    set((state) => ({
      missions: state.missions.map((m) => (m.id === id ? updated : m)),
    }))
    return updated
  },

  startMission: async (id) => {
    const res = await api.post(`/missions/${id}/start`)
    const updated = res.data
    set((state) => ({
      missions: state.missions.map((m) => (m.id === id ? updated : m)),
      activeMission: updated,
    }))
    return updated
  },

  abortMission: async (id, reason) => {
    const res = await api.post(`/missions/${id}/abort`, { reason })
    const updated = res.data
    set((state) => ({
      missions: state.missions.map((m) => (m.id === id ? updated : m)),
      activeMission: state.activeMission?.id === id ? null : state.activeMission,
    }))
    return updated
  },

  clearMissions: async () => {
    await api.delete('/missions')
    set({ missions: [], total: 0, activeMission: null })
  },

  // Called by WebSocket handler when mission status changes
  updateMissionStatus: (missionId, status, extra = {}) => {
    set((state) => {
      const updated = state.missions.map((m) =>
        m.id === missionId ? { ...m, status, ...extra } : m
      )
      const active = updated.find(
        (m) => ['READY', 'IN_FLIGHT', 'DELIVERED', 'RETURNING'].includes(m.status)
      )
      return { missions: updated, activeMission: active || null }
    })
  },
}))

export default useMissionStore
