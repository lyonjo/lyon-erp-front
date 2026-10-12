import { defineStore } from 'pinia'
import api from '@/api'

export const useSettingsStore = defineStore('settings', {
  state: () => ({ name: '', logo: null, primary_color: '#4f46e5', error: null }),
  actions: {
    async load() {
      try {
        const { data } = await api.get('/settings')
        Object.assign(this, data)
        document.documentElement.style.setProperty('--primary', this.primary_color)
        document.title = this.name
      } catch (e) {
        this.error = e.response?.data?.message || 'Unknown website'
      }
    },
  },
})
