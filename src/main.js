import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settings'
import { i18n, initializeLocale } from './i18n'

initializeLocale()
const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)

useSettingsStore()
  .load()
  .finally(() => app.mount('#app'))
