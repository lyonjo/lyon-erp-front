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
    isAuthenticated: (state) => !!state.token,
    hasModule: (state) => (module) => state.modules.includes(module),
    can: (state) => (permission) => state.permissions.includes(permission),
  },

  actions: {
    clearSession() {
      this.user = null
      this.modules = []
      this.permissions = []
      this.token = null

      localStorage.removeItem('token')
    },

    async login(email, password) {
      // Remove any previous session before starting a new login.
      this.clearSession()

      try {
        const { data } = await api.post('/login', {
          email,
          password,
        })

        if (!data.token) {
          throw new Error('Login response did not include a token.')
        }

        this.token = data.token
        localStorage.setItem('token', data.token)

        await this.fetchUser()
      } catch (error) {
        this.clearSession()
        throw error
      }
    },

    async fetchUser() {
      try {
        const { data } = await api.get('/me')

        this.user = data.user
        this.modules = data.modules ?? []
        this.permissions = data.permissions ?? []

        return this.user
      } catch (error) {
        if (error.response?.status === 401) {
          this.clearSession()
        }

        throw error
      }
    },

    async logout() {
      try {
        if (this.token) {
          await api.post('/logout')
        }
      } catch (error) {
        console.warn('Backend logout failed:', error)
      } finally {
        this.clearSession()
      }
    },
  },
})
