<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MODULES } from '@/modules/registry'

defineProps({ title: String, items: Array })

const auth = useAuthStore()
const router = useRouter()
const products = computed(() => auth.modules.map((k) => MODULES[k]).filter(Boolean))

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <header
    style="
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 12px 24px;
      font-family: sans-serif;
    "
  >
    <strong>{{ title }}</strong>

    <nav style="display: flex; gap: 16px; flex: 1">
      <template v-for="item in items" :key="item.to">
        <router-link v-if="!item.permission || auth.can(item.permission)" :to="item.to">
          {{ item.label }}
        </router-link>
      </template>
    </nav>

    <select v-if="products.length > 1" @change="router.push($event.target.value)">
      <option value="" disabled selected>Switch product</option>
      <option v-for="p in products" :key="p.key" :value="p.path">{{ p.name }}</option>
    </select>
    <span>{{ auth.user?.name }}</span>
    <button @click="logout">Logout</button>
  </header>
</template>
