import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settings'

const app = createApp(App)
app.use(createPinia())
app.use(router)

useSettingsStore()
  .load()
  .finally(() => app.mount('#app'))
