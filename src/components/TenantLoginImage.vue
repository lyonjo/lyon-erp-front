<script setup>
import { toRef } from 'vue'
import { useTenantLoginImage } from '@/composables/useTenantLoginImage'

const props = defineProps({
  slot: { type: String, required: true, validator: (v) => ['logo', 'illustration'].includes(v) },
  fallbackSrc: { type: String, required: true },
  revision: { type: Number, default: 0 },
  alt: { type: String, default: '' },
})

const { src, loading, custom, error, refresh } = useTenantLoginImage(
  toRef(props, 'slot'), toRef(props, 'fallbackSrc'), toRef(props, 'revision'),
)

defineExpose({ refresh })
</script>

<template>
  <img :src="src || fallbackSrc" :alt="alt" v-bind="$attrs" />
</template>
