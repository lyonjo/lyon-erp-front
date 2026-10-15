<script setup>
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n({ useScope: 'global' })
watch(
  locale,
  (value) => {
    document.documentElement.lang = value
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'
  },
  { immediate: true },
)
</script>

<template>
  <router-view />
</template>

<style>
/* Logical properties let normal layouts adapt automatically to RTL. */
html {
  text-align: start;
}
body {
  margin: 0;
}
input,
textarea {
  font: inherit;
}
</style>
