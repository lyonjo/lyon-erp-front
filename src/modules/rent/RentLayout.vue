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
  <main class="content rent-module-content"><router-view /></main>
</template>

<style scoped>
.content {
  padding: 24px 32px;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
}
</style>

<!-- Only the Rent page area is affected; ModuleNavbar is a sibling, not a descendant. -->
<style>
html[dir='rtl'] .rent-module-content {
  direction: rtl;
  text-align: right;
}

/* Page-level headings (not centered tab labels or modal titles). */
html[dir='rtl'] .rent-module-content > * > h1:first-child,
html[dir='rtl'] .rent-module-content > * > h2:first-child {
  text-align: right !important;
}

/* Preserve normal English page alignment. */
html[dir='ltr'] .rent-module-content {
  direction: ltr;
  text-align: left;
}
</style>
