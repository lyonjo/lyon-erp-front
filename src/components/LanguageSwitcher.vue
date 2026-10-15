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
    <svg
      class="globe"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c-4 4-4 14 0 18M12 3c4 4 4 14 0 18" />
    </svg>
    <select v-model="selected" :aria-label="t('common.language')">
      <option value="en">English</option>
      <option value="ar">العربية</option>
    </select>
    <svg
      class="chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </label>
</template>

<style scoped>
.language-switcher {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: var(--language-height, 56px);
  min-width: 115px;
  padding-inline: 13px;
  border-radius: 23px;
  box-shadow:
    0 0 0 1px #c9d5df,
    0 1px 2px rgba(0, 0, 0, 0.05);
  background: linear-gradient(to bottom, #d9e8f2, #c3d2de);
  color: #1f2937;
  cursor: pointer;
  white-space: nowrap;
  transition: filter 0.15s;
}
.language-switcher:hover {
  filter: brightness(1.03);
}
.language-switcher:focus-within {
  outline: 2px solid #4f93b8;
  outline-offset: 2px;
}
.globe {
  width: 17px;
  height: 17px;
  flex: none;
}
.chevron {
  width: 14px;
  height: 14px;
  flex: none;
  pointer-events: none;
}
.language-switcher select {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  direction: ltr;
}
.language-switcher option {
  background: white;
  color: #1f2937;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 1023px) {
  .language-switcher {
    min-width: 103px;
    padding-inline: 9px;
    border-radius: 14px;
    gap: 5px;
  }
  .globe {
    width: 15px;
    height: 15px;
  }
}
</style>
