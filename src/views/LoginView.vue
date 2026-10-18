<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import TenantLoginImage from '@/components/TenantLoginImage.vue'

import defaultLogo from '@/assets/logo.png'
import illustration from '@/assets/login-illustration.png'

const auth = useAuthStore()
const settings = useSettingsStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)

async function submit() {
  if (loading.value) return

  error.value = ''
  loading.value = true

  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value =
      e.response?.data?.errors?.email?.[0] || e.response?.data?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <section class="left">
      <form class="form" @submit.prevent="submit">
        <!-- Tenant logo with default fallback -->
        <TenantLoginImage
          slot="logo"
          :fallback-src="settings.logo || defaultLogo"
          alt="Logo"
          class="logo"
        />

        <h1>Hi,<br />Welcome Back</h1>

        <p v-if="settings.error" class="error">
          {{ settings.error }}
        </p>

        <template v-else>
          <label for="email">User Name</label>

          <input id="email" v-model="email" type="email" autocomplete="username" required />

          <label for="password">Password</label>

          <div class="password">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
            />

            <button
              type="button"
              class="eye"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <svg
                v-if="!showPassword"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>

              <svg
                v-else
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>

          <a href="#" class="forgot" @click.prevent> Forgot password? </a>

          <p v-if="error" class="error">
            {{ error }}
          </p>

          <button class="submit" type="submit" :disabled="loading">
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </template>
      </form>
    </section>

    <section class="right">
      <div class="card">
        <!-- Tenant illustration with default fallback -->
        <TenantLoginImage slot="illustration" :fallback-src="illustration" alt="" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 4vw;
  padding: 3vh 5vw;
  box-sizing: border-box;
  overflow-y: auto;
  background: #fff;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #151c2c;
}

.left {
  display: flex;
  justify-content: center;
}

.form {
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
}

.logo {
  height: clamp(44px, 9vh, 80px);
  align-self: center;
  object-fit: contain;
  margin-bottom: clamp(16px, 5vh, 40px);
}

h1 {
  font-size: clamp(24px, 5vh, 38px);
  line-height: 1.2;
  font-weight: 700;
  margin: 0 0 clamp(14px, 4vh, 28px);
}

label {
  font-weight: 600;
  font-size: clamp(14px, 2.2vh, 16px);
  margin-bottom: 6px;
}

input {
  width: 100%;
  box-sizing: border-box;
  height: clamp(38px, 6.5vh, 46px);
  padding: 0 14px;
  border: 1px solid #dbe3f5;
  border-radius: 10px;
  background: #e8eefc;
  font-size: 15px;
  color: #151c2c;
  margin-bottom: clamp(10px, 2.5vh, 18px);
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

input:focus {
  border-color: #5d9cc7;
  box-shadow: 0 0 0 3px rgba(93, 156, 199, 0.25);
}

.password {
  position: relative;
}

.password input {
  padding-right: 44px;
  margin-bottom: 10px;
}

.eye {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  margin-top: -5px;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: #555;
  display: flex;
}

.forgot {
  font-size: 13px;
  color: #3b7be8;
  text-decoration: none;
  align-self: flex-start;
  margin-bottom: clamp(14px, 4vh, 28px);
}

.forgot:hover {
  text-decoration: underline;
}

.submit {
  height: clamp(40px, 6.5vh, 46px);
  border: 0;
  border-radius: 999px;
  background: #5d9cc7;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    opacity 0.15s;
}

.submit:hover:not(:disabled) {
  background: #4a89b4;
}

.submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  color: #c62828;
  font-size: 14px;
  margin: 0 0 12px;
}

.right {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.card {
  height: 100%;
  max-height: 94vh;
  max-width: 100%;
  aspect-ratio: 550 / 760;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@media (max-width: 900px) {
  .page {
    grid-template-columns: 1fr;
    padding: 24px;
  }

  .right {
    display: none;
  }
}
</style>
