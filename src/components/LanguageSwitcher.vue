<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const isOpen = ref(false)
const root = ref(null)

const languages = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ar', label: 'العربية', short: 'AR' },
]

const currentLanguage = computed(
  () => languages.find((l) => l.code === locale.value) || languages[0],
)

function selectLanguage(code) {
  locale.value = code
  document.documentElement.lang = code
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
  isOpen.value = false
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function handleClickOutside(event) {
  if (root.value && !root.value.contains(event.target)) {
    isOpen.value = false
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="root" class="language-switcher">
    <button
      type="button"
      class="language-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      aria-label="Select language"
      @click="toggleDropdown"
    >
      <svg
        class="globe-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a15 15 0 0 1 0 18" />
        <path d="M12 3a15 15 0 0 0 0 18" />
      </svg>

      <span class="language-label">
        {{ currentLanguage.label }}
      </span>

      <svg
        class="chevron"
        :class="{ rotated: isOpen }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div v-if="isOpen" class="language-menu" dir="ltr">
      <div class="menu-title">
        {{ locale === 'ar' ? 'اختر اللغة' : 'Select Language' }}
      </div>

      <button
        v-for="language in languages"
        :key="language.code"
        type="button"
        class="language-option"
        :class="{ selected: locale === language.code }"
        @click="selectLanguage(language.code)"
      >
        <span class="language-short">
          {{ language.short }}
        </span>

        <span class="option-label" :dir="language.code === 'ar' ? 'rtl' : 'ltr'">
          {{ language.label }}
        </span>

        <svg
          v-if="locale === language.code"
          class="check-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.language-switcher {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
}

/* Main button — matches navbar */
.language-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  height: 56px;
  min-width: 130px;
  padding: 0 17px;
  border: 0;
  border-radius: 23px;

  background: linear-gradient(to bottom, #d9e8f2, #c3d2de);
  box-shadow:
    0 0 0 1px #c9d5df,
    0 1px 2px rgba(0, 0, 0, 0.05);

  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  transition:
    filter 0.15s,
    box-shadow 0.15s;
}

.language-trigger:hover {
  filter: brightness(1.04);
}

.language-trigger:focus-visible {
  outline: 2px solid #4f93b8;
  outline-offset: 3px;
}

.globe-icon {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
}

.language-label {
  white-space: nowrap;
}

.chevron {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.chevron.rotated {
  transform: rotate(180deg);
}

/* Custom dropdown */
.language-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  left: auto;
  width: 190px;
  box-sizing: border-box;
  padding: 8px;

  border: 1px solid #dbe4ec;
  border-radius: 14px;
  background: #fff;

  box-shadow:
    0 12px 32px rgba(31, 41, 55, 0.13),
    0 2px 6px rgba(31, 41, 55, 0.04);

  z-index: 2000;
}

.menu-title {
  padding: 9px 11px;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-align: start;
  border-bottom: 1px solid #edf0f4;
}

/* Options */
.language-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 10px;
  border: 0;
  border-radius: 9px;

  background: transparent;
  color: #374151;
  text-align: start;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;

  transition:
    background 0.15s,
    color 0.15s;
}

.language-option:hover {
  background: #eaf3f9;
  color: #2f7099;
}

.language-option.selected {
  background: #e5f1f8;
  color: #2f7099;
  font-weight: 600;
}

.language-short {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  flex-shrink: 0;

  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #f8fafc;

  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.language-option.selected .language-short {
  border-color: #c4ddea;
  background: #d4e8f5;
  color: #2f7099;
}

.option-label {
  flex: 1;
  white-space: nowrap;
}

.check-icon {
  width: 16px;
  height: 16px;
  color: #4f93b8;
  flex-shrink: 0;
}

/* Positioning in RTL */
:global(html[dir='rtl']) .language-menu {
  right: auto;
  left: 0;
}

/* Match the compact navbar */
@media (min-width: 1024px) and (max-width: 1280px) {
  .language-trigger {
    height: 48px;
    border-radius: 20px;
  }
}

@media (max-width: 640px) {
  .language-trigger {
    height: 40px;
    min-width: 105px;
    padding: 0 11px;
    border-radius: 15px;
    gap: 6px;
    font-size: 12px;
  }

  .language-menu {
    width: 175px;
  }
}
</style>
