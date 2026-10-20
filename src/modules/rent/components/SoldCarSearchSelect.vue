<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String, null], default: null },
  displayValue: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  loading: Boolean,
  placeholder: { type: String, default: '' },
  optionLabel: { type: Function, required: true },
  error: { type: String, default: '' },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue', 'search', 'select'])
const text = ref(props.displayValue)
const open = ref(false)
const root = ref(null)
let timeout = null

watch(() => props.displayValue, (value) => { text.value = value || '' })
function type(value) {
  text.value = value
  emit('update:modelValue', null)
  open.value = true
  clearTimeout(timeout)
  timeout = setTimeout(() => emit('search', value.trim()), 250)
}
function expand() {
  if (props.disabled) return
  open.value = true
  emit('search', text.value === props.displayValue ? '' : text.value.trim())
}
function pick(row) {
  emit('update:modelValue', row.id)
  emit('select', row)
  text.value = props.optionLabel(row, true)
  open.value = false
}
function outside(event) { if (!root.value?.contains(event.target)) open.value = false }
function escape(event) { if (event.key === 'Escape') open.value = false }
onMounted(() => { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape) })
onBeforeUnmount(() => { clearTimeout(timeout); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) })
</script>

<template>
  <div ref="root" class="picker">
    <div class="field">
      <input :value="text" :placeholder="placeholder" :disabled="disabled" autocomplete="off" @input="type($event.target.value)" @focus="expand" />
      <button type="button" :disabled="disabled" class="arrow" aria-label="Open options" @click="open ? open = false : expand()">⌄</button>
    </div>
    <div v-if="open" class="results" role="listbox">
      <div v-if="loading" class="empty">Loading…</div>
      <button v-for="row in results" :key="row.id" type="button" class="result" @click="pick(row)">
        {{ optionLabel(row) }}
      </button>
      <div v-if="!loading && !results.length" class="empty"><slot name="empty">No results</slot></div>
    </div>
    <small v-if="error" class="error">{{ error }}</small>
  </div>
</template>

<style scoped>
.picker{position:relative;width:100%}.field{display:flex;border:1px solid #cdd7e4;border-radius:11px;height:42px;background:#fff;overflow:hidden}.field:focus-within{outline:2px solid #d4e8f4;border-color:#6e9fc2}.field input{flex:1;min-width:0;outline:0;border:0;background:transparent;padding:0 14px;font:inherit;color:#15233b}.arrow{width:40px;border:0;background:transparent;cursor:pointer;color:#52677f;font-size:20px}.results{position:absolute;top:calc(100% + 5px);inset-inline:0;z-index:20;max-height:240px;overflow:auto;border:1px solid #dce4ed;background:white;border-radius:12px;box-shadow:0 12px 30px #21394c24;padding:5px}.result{display:block;width:100%;border:0;background:white;color:#15233b;text-align:start;cursor:pointer;padding:11px 12px;border-radius:8px;font:inherit}.result:hover,.result:focus-visible{background:#eaf3f9}.empty{padding:12px;color:#7d8b9c;font-size:13px}.error{display:block;color:#cf2537;margin-top:5px}
</style>
