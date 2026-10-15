import { createI18n } from 'vue-i18n'
import en from './locales/en.js'
import ar from './locales/ar.js'

const STORAGE_KEY = 'lyon_locale'
const supported = ['en', 'ar']
const saved = localStorage.getItem(STORAGE_KEY)
const locale = supported.includes(saved) ? saved : 'en'

export const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'en',
  messages: { en, ar },
  missingWarn: false,
  fallbackWarn: false,
})

export function setAppLocale(value) {
  if (!supported.includes(value)) return
  i18n.global.locale.value = value
  localStorage.setItem(STORAGE_KEY, value)
  document.documentElement.lang = value
  document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'
}

export function initializeLocale() {
  setAppLocale(i18n.global.locale.value)
}
