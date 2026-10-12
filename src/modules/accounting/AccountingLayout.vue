<script setup>
import TopNav from '@/components/TopNav.vue'
import nav from './nav'
</script>

<template>
  <TopNav title="Accounting System" :items="nav" />
  <main style="padding: 24px; font-family: sans-serif"><router-view /></main>
</template>
