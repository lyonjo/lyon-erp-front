<script setup>
import { computed } from 'vue'
const props = defineProps({
  page: { type: Number, default: 1 },
  lastPage: { type: Number, default: 1 },
  disabled: Boolean,
})
const emit = defineEmits(['change'])
const total = computed(() => Math.max(1, Number(props.lastPage) || 1))
const active = computed(() => Math.max(1, Math.min(total.value, Number(props.page) || 1)))
const pages = computed(() => {
  const last = total.value,
    cur = active.value
  const set = new Set([1, last])
  for (let n = Math.max(1, cur - 2); n <= Math.min(last, cur + 2); n++) set.add(n)
  const list = [...set].sort((a, b) => a - b),
    result = []
  for (let i = 0; i < list.length; i++) {
    if (i && list[i] - list[i - 1] > 1) result.push('gap-' + i)
    result.push(list[i])
  }
  return result
})
function select(n) {
  if (!props.disabled && n >= 1 && n <= total.value && n !== active.value) emit('change', n)
}
</script>
<template>
  <nav class="table-pager" dir="ltr" aria-label="Table pages">
    <button
      type="button"
      class="table-pager-arrow"
      :disabled="disabled || active <= 1"
      aria-label="Previous page"
      @click="select(active - 1)"
    >
      ‹
    </button>
    <template v-for="n in pages" :key="n">
      <span v-if="typeof n === 'string'" class="table-pager-gap">…</span>
      <button
        v-else
        type="button"
        class="table-pager-number"
        :class="{ selected: n === active }"
        :aria-current="n === active ? 'page' : undefined"
        :disabled="disabled"
        @click="select(n)"
      >
        {{ n }}
      </button>
    </template>
    <button
      type="button"
      class="table-pager-arrow"
      :disabled="disabled || active >= total"
      aria-label="Next page"
      @click="select(active + 1)"
    >
      ›
    </button>
  </nav>
</template>
<style scoped>
.table-pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 20px 8px;
  flex-wrap: wrap;
}
.table-pager button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 35px;
  min-width: 35px;
  height: 35px;
  padding: 0;
  border: 1px solid #dce3ec;
  border-radius: 8px;
  background: #fff;
  color: #34435a;
  font:
    600 13px 'Segoe UI',
    sans-serif;
  cursor: pointer;
  transition: background 0.15s;
}
.table-pager button:hover:not(:disabled) {
  background: #eef4f8;
}
.table-pager button.selected {
  background: #629fc2;
  color: #fff;
  border-color: #629fc2;
}
.table-pager button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.table-pager-gap {
  min-width: 22px;
  text-align: center;
  color: #8795a7;
}
</style>
