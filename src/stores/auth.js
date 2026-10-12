import { defineStore } from 'pinia'
import api from '@/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    modules: [],
    permissions: [],
    token: localStorage.getItem('token'),
  }),
  getters: {
    hasModule: (s) => (m) => s.modules.includes(m),
    can: (s) => (p) => s.permissions.includes(p),
  },
  actions: {
    async login(email, password) {
      const { data } = await api.post('/login', { email, password })
      this.token = data.token
      localStorage.setItem('token', data.token)
      await this.fetchUser()
    },
    async fetchUser() {
      const { data } = await api.get('/me')
      this.user = data.user
      this.modules = data.modules
      this.permissions = data.permissions
    },
    async logout() {
      try {
        await api.post('/logout')
      } catch {}
      this.$reset()
      this.token = null
      localStorage.removeItem('token')
    },
  },
})
