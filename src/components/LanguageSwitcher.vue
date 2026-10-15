<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setAppLocale } from '@/i18n'

const { locale, t } = useI18n({ useScope: 'global' })
const selected = computed({
  get: () => locale.value,
  set: (value) => setAppLocale(value),
})
</script>

<template>
  <label class="language-switcher">
    <span class="sr-only">{{ t('common.language') }}</span>
    <select v-model="selected" :aria-label="t('common.language')">
      <option value="en">English</option>
      <option value="ar">العربية</option>
    </select>
  </label>
</template>

<style scoped>
.language-switcher { display: inline-flex; align-items: center; }
.language-switcher select { min-height: 36px; border: 1px solid #c9d5df; border-radius: 10px; background: #fff; color: #1f2937; padding: 5px 12px; font: inherit; cursor: pointer; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style>
