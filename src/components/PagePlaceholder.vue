<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <h2 style="font-size: 22px; font-weight: 600">{{ route.meta.title }}</h2>
  <p style="color: #6b7280">This page is not built yet.</p>
</template>
