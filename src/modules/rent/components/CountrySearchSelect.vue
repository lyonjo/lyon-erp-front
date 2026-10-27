<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
  props.options.find((option) => String(option.value) === String(props.modelValue)),
)
const display = computed(() => selected.value?.label ?? String(props.modelValue ?? ''))
const matches = computed(() => {
  const search = query.value.trim().toLocaleLowerCase()
  if (!search) return props.options
  return props.options.filter((option) =>
    `${option.label} ${option.search || ''} ${option.value}`.toLocaleLowerCase().includes(search),
  )
})

watch(
  () => [props.modelValue, props.options],
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

function onInput(event) {
  query.value = event.target.value
  opened.value = true
}

function toggle() {
  if (opened.value) close()
  else open()
}

function onOutside(event) {
  if (root.value && !root.value.contains(event.target)) close()
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
  if (event.key === 'Enter' && opened.value && matches.value.length === 1) {
    event.preventDefault()
    choose(matches.value[0])
  }
}

onMounted(() => document.addEventListener('pointerdown', onOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside))
</script>

<template>
  <div ref="root" class="country-select" @keydown="onKeydown">
    <div class="control" :class="{ invalid: invalid, opened: opened }">
      <input
        ref="input"
        :value="opened ? query : display"
        :placeholder="placeholder"
        autocomplete="off"
        role="combobox"
        :aria-expanded="opened"
        @focus="open"
        @input="onInput"
      />
      <button type="button" class="toggle" :aria-label="opened ? 'Close' : 'Open'" @click="toggle">
        <span aria-hidden="true">⌄</span>
      </button>
    </div>
    <ul v-if="opened" class="options" role="listbox">
      <li
        v-for="(option, index) in matches"
        :key="index"
        role="option"
        :aria-selected="String(option.value) === String(modelValue)"
        @mousedown.prevent="choose(option)"
      >
        {{ option.label }}
      </li>
      <li v-if="matches.length === 0" class="none">No matching countries / لا توجد نتائج</li>
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
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 2px solid #d1d5db;
  border-radius: 9px;
  background: #fff;
}
.control:focus-within {
  border-color: #6f9fbd;
}
.control.invalid {
  border-color: #dc2626;
}
.control input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 12px;
  border: 0 !important;
  background: transparent !important;
  outline: 0;
  box-shadow: none !important;
  font: inherit;
  direction: auto;
}
.toggle {
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: #475569;
  cursor: pointer;
}
.options {
  position: absolute;
  top: calc(100% + 4px);
  inset-inline-start: 0;
  z-index: 40;
  box-sizing: border-box;
  width: 100%;
  max-height: 270px;
  overflow-y: auto;
  padding: 4px;
  margin: 0;
  list-style: none;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 28px #0002;
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
