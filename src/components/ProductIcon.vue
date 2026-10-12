<script setup>
defineProps({ name: String, size: { type: Number, default: 24 } })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- rent: car -->
    <template v-if="name === 'rent'">
      <path d="M5 16h14M3 16v-3.5l2-5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5l2 5V16" />
      <path d="M3 16v2h3v-2M18 16v2h3v-2" />
      <circle cx="7.5" cy="12.5" r="1" />
      <circle cx="16.5" cy="12.5" r="1" />
    </template>
    <!-- accounting: calculator -->
    <template v-else-if="name === 'accounting'">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <rect x="8" y="6" width="8" height="3" rx="0.5" />
      <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01" />
    </template>
    <!-- employee: people -->
    <template v-else-if="name === 'employee'">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.2a6 6 0 0 1 3 5.8" />
    </template>
    <!-- tourism: globe -->
    <template v-else-if="name === 'tourism'">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </template>
    <!-- services: wrench -->
    <template v-else-if="name === 'services'">
      <path d="M14.7 6.3a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.7-8.7z" />
      <path d="M14.7 6.3a4 4 0 0 1 5-1.6l-2.4 2.4 1 2.3 2.3 1" />
    </template>
    <!-- marketing: megaphone -->
    <template v-else-if="name === 'marketing'">
      <path d="M4 10v4h3l8 4V6L7 10H4z" />
      <path d="M18.5 9a4 4 0 0 1 0 6M7 14l1.5 5" />
    </template>
    <!-- pos: cart -->
    <template v-else-if="name === 'pos'">
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="18" cy="20" r="1.3" />
      <path d="M3 4h2.5l2.2 11h10.6l2-8H6.3" />
    </template>
    <!-- fallback -->
    <rect v-else x="4" y="4" width="16" height="16" rx="3" />
  </svg>
</template>
