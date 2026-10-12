<script setup>
import ModuleNavbar from '@/components/ModuleNavbar.vue'
import { useSettingsStore } from '@/stores/settings'
import groups from './nav'

const settings = useSettingsStore()
</script>

<template>
  <ModuleNavbar
    :title="`Lyon${settings.name ? ' - ' + settings.name : ''}`"
    :groups="groups"
    module="rent"
  />
  <main class="content"><router-view /></main>
</template>

<style scoped>
.content {
  padding: 24px 32px;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
}
</style>
