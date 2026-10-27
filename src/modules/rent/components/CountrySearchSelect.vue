<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Search...' },
  invalid: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const root = ref(null)
const input = ref(null)
const opened = ref(false)
const query = ref('')
const selected = computed(() =>
  props.options.find((o) => String(o.value) === String(props.modelValue)),
)
const display = computed(() => selected.value?.label || String(props.modelValue || ''))
const matches = computed(() => {
  const q = query.value.trim().toLocaleLowerCase()
  if (!q) return props.options
  return props.options.filter((o) =>
    `${o.label} ${o.search || ''} ${o.value}`.toLocaleLowerCase().includes(q),
  )
})
watch(
  () => props.modelValue,
  () => {
    if (!opened.value) query.value = display.value
  },
  { immediate: true },
)
function choose(option) {
  emit('update:modelValue', option.value)
  query.value = option.label
  opened.value = false
}
function open() {
  opened.value = true
  query.value = ''
  nextTick(() => input.value?.focus())
}
function close() {
  opened.value = false
  query.value = display.value
}
function onOutside(e) {
  if (root.value && !root.value.contains(e.target)) close()
}
function keydown(e) {
  if (e.key === 'Escape') close()
  if (e.key === 'Enter' && opened.value && matches.value.length === 1) {
    e.preventDefault()
    choose(matches.value[0])
  }
}
if (typeof document !== 'undefined') document.addEventListener('pointerdown', onOutside)
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('pointerdown', onOutside)
})
</script>

<template>
  <div ref="root" class="country-select" @keydown="keydown">
    <div class="control" :class="{ invalid, opened }">
      <input
        ref="input"
        :value="opened ? query : display"
        :placeholder="placeholder"
        autocomplete="off"
        role="combobox"
        :aria-expanded="opened"
        @focus="open"
        @input="
          query = $event.target.value
          opened = true
        "
      />
      <button
        type="button"
        class="toggle"
        :aria-label="opened ? 'Close' : 'Open'"
        @click="opened ? close() : open()"
      >
        ⌄
      </button>
    </div>
    <ul v-if="opened" class="options" role="listbox">
      <li
        v-for="(o, idx) in matches"
        :key="`${o.value}-${idx}`"
        role="option"
        :aria-selected="String(o.value) === String(modelValue)"
        @mousedown.prevent="choose(o)"
      >
        {{ o.label }}
      </li>
      <li v-if="!matches.length" class="none">No matching countries / لا توجد نتائج</li>
    </ul>
  </div>
</template>

<style scoped>
.country-select {
  position: relative;
  width: 100%;
  min-width: 0;
}
.control {
  display: flex;
  width: 100%;
  height: 40px;
  align-items: center;
  box-sizing: border-box;
  border: 2px solid #d1d5db;
  background: #fff;
  border-radius: 9px;
}
.control:focus-within {
  border-color: #6f9fbd;
}
.control.invalid {
  border-color: #dc2626;
}
.control input {
  border: 0 !important;
  background: transparent !important;
  outline: 0;
  box-shadow: none !important;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 12px;
  font: inherit;
  direction: auto;
}
.toggle {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #475569;
  padding: 0 12px;
}
.options {
  position: absolute;
  top: calc(100% + 4px);
  inset-inline-start: 0;
  width: 100%;
  max-height: 270px;
  overflow-y: auto;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  box-shadow: 0 10px 28px #0002;
  z-index: 40;
  list-style: none;
  margin: 0;
  padding: 4px;
}
.options li {
  padding: 9px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  unicode-bidi: plaintext;
}
.options li:hover,
.options li[aria-selected='true'] {
  background: #eaf3f9;
}
.options li.none {
  color: #64748b;
  cursor: default;
}
</style>
