<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { MODULES } from '@/modules/registry'
import ProductIcon from '@/components/ProductIcon.vue'

const auth = useAuthStore()
const settings = useSettingsStore()
const router = useRouter()

const products = computed(() => auth.modules.map((k) => MODULES[k]).filter(Boolean))

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="page">
    <header class="top">
      <span class="brand"
        >Lyon<span v-if="settings.name"> - {{ settings.name }}</span></span
      >

      <div class="user-pill">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.51 4.51 0 0 0 12 12Z" />
          <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </svg>
        <span class="name">{{ auth.user?.name }}</span>
        <button type="button" class="logout" title="Log out" @click="logout">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 12H3" />
            <path d="M11 8l-4 4 4 4" />
            <path d="M15 4h5v16h-5" />
          </svg>
        </button>
      </div>
    </header>

    <main class="main">
      <section class="hero">
        <h1>{{ greeting }}, {{ auth.user?.name }}</h1>
        <p>Choose a product to continue.</p>
      </section>

      <p v-if="!products.length" class="empty">No active products for this account.</p>

      <section class="grid">
        <router-link v-for="p in products" :key="p.key" :to="p.path" class="card">
          <span class="badge"><ProductIcon :name="p.key" :size="30" /></span>
          <h2>{{ p.name }}</h2>
          <p>{{ p.description }}</p>
          <span class="open">
            Open
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </router-link>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #111827;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
}
.brand {
  font-size: 20px;
  font-weight: 600;
  white-space: nowrap;
}

.user-pill {
  height: 48px;
  padding: 0 8px 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 23px;
  color: #1f2937;
  box-shadow:
    0 0 0 1px #c9d5df,
    0 1px 2px rgba(0, 0, 0, 0.05);
  background: linear-gradient(to bottom, #d9e8f2, #c3d2de);
}
.name {
  font-size: 14px;
  font-weight: 500;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.logout {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.logout:hover {
  background: #709ebd;
  color: #fff;
}

.main {
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 32px 64px;
}
.hero {
  margin-bottom: 32px;
}
.hero h1 {
  margin: 0 0 6px;
  font-size: 30px;
  font-weight: 700;
}
.hero p {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}
.empty {
  color: #6b7280;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  background: linear-gradient(to top, #eef2f6 0%, #f9fafb 60%, #fff 100%);
  box-shadow:
    0 0 0 1px #dbe4ec,
    0 2px 6px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.18s,
    box-shadow 0.18s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 0 0 1px #709ebd,
    0 12px 28px rgba(112, 158, 189, 0.25);
}

.badge {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  border-radius: 18px;
  color: #2f5f80;
  box-shadow: 0 0 0 1px #c9d5df;
  background: linear-gradient(to bottom, #d9e8f2, #c3d2de);
  transition:
    background 0.18s,
    color 0.18s;
}
.card:hover .badge {
  background: #709ebd;
  color: #fff;
}

.card h2 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
}
.card p {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.5;
  color: #6b7280;
  flex: 1;
}

.open {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #3b7099;
}
.open svg {
  transition: transform 0.18s;
}
.card:hover .open svg {
  transform: translateX(4px);
}

@media (max-width: 600px) {
  .top {
    padding: 12px 16px;
  }
  .main {
    padding: 24px 16px 48px;
  }
  .hero h1 {
    font-size: 24px;
  }
  .name {
    display: none;
  }
  .user-pill {
    padding-left: 12px;
  }
}
</style>
