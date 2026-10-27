<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Search...' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  labelOf: { type: Function, required: true },
})
const emit = defineEmits(['update:modelValue', 'search'])
const wrapper = ref(null)
const text = ref('')
const opened = ref(false)
const selected = computed(() =>
  props.options.find((o) => String(o.id) === String(props.modelValue)),
)
const selectedLabel = ref('')
watch(
  selected,
  (value) => {
    if (value) selectedLabel.value = props.labelOf(value)
  },
  { immediate: true },
)
watch(
  () => props.modelValue,
  (value) => {
    if (value === '' || value === null || value === undefined) selectedLabel.value = ''
    if (!opened.value) text.value = selectedLabel.value
  },
  { immediate: true },
)
watch(selectedLabel, (value) => {
  if (!opened.value) text.value = value
})
function focus() {
  if (props.disabled) return
  opened.value = true
  text.value = ''
  emit('search', '')
}
function type(value) {
  text.value = value
  opened.value = true
  emit('search', value)
}
function choose(option) {
  selectedLabel.value = props.labelOf(option)
  emit('update:modelValue', option.id)
  text.value = selectedLabel.value
  opened.value = false
}
function close() {
  opened.value = false
  text.value = selectedLabel.value
}
function outside(e) {
  if (wrapper.value && !wrapper.value.contains(e.target)) close()
}
if (typeof document !== 'undefined') document.addEventListener('mousedown', outside)
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('mousedown', outside)
})
</script>
<template>
  <div ref="wrapper" class="combo">
    <input
      :value="text"
      :disabled="disabled"
      :placeholder="placeholder"
      autocomplete="off"
      role="combobox"
      :aria-expanded="opened"
      @focus="focus"
      @input="type($event.target.value)"
      @keydown.esc="close"
      @keydown.enter.prevent="opened && options.length ? choose(options[0]) : close()"
    />
    <button type="button" class="arrow" :disabled="disabled" @click="opened ? close() : focus()">
      ⌄
    </button>
    <div v-if="opened && !disabled" class="list" role="listbox">
      <div v-if="loading" class="empty">Loading...</div>
      <button
        v-for="item in options"
        :key="item.id"
        type="button"
        class="option"
        @click="choose(item)"
      >
        {{ labelOf(item) }}
      </button>
      <div v-if="!loading && !options.length" class="empty">No results</div>
    </div>
  </div>
</template>
<style scoped>
.combo {
  position: relative;
  width: 100%;
}
.combo > input {
  width: 100%;
  height: 39px;
  border: 1px solid #ced8e5;
  border-radius: 8px;
  padding: 8px 32px 8px 12px;
  background: white;
  box-sizing: border-box;
}
.combo > input:disabled {
  background: #f7f9fc;
}
.arrow {
  position: absolute;
  inset-inline-end: 3px;
  top: 3px;
  height: 32px;
  width: 27px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.list {
  position: absolute;
  top: calc(100% + 4px);
  inset-inline: 0;
  z-index: 50;
  max-height: 230px;
  overflow: auto;
  background: white;
  border: 1px solid #d3dce8;
  border-radius: 9px;
  box-shadow: 0 8px 20px #10244720;
}
.option {
  display: block;
  text-align: start;
  width: 100%;
  border: 0;
  background: white;
  padding: 10px 12px;
  font-size: 13px;
  cursor: pointer;
}
.option:hover,
.option:focus {
  background: #edf5fc;
}
.empty {
  padding: 10px;
  font-size: 13px;
  color: #8a98a9;
}
</style>
