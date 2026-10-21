<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  items: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Search...' },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])
const search = ref(''),
  open = ref(false),
  root = ref(null)
const selected = computed(() => props.items.find((x) => String(x.id) === String(props.modelValue)))
const filtered = computed(() =>
  props.items
    .filter((x) =>
      String(x.name || '')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    )
    .slice(0, 80),
)
watch(
  () => props.modelValue,
  () => {
    if (!open.value) search.value = selected.value?.name || ''
  },
  { immediate: true },
)
watch(
  () => props.items,
  () => {
    if (!open.value) search.value = selected.value?.name || ''
  },
)
function choose(item) {
  emit('update:modelValue', item.id)
  search.value = item.name
  open.value = false
}
function input(e) {
  search.value = e.target.value
  open.value = true
  emit('update:modelValue', '')
}
function focus() {
  if (props.disabled) return
  search.value = ''
  open.value = true
}
function outside(e) {
  if (root.value && !root.value.contains(e.target)) {
    open.value = false
    search.value = selected.value?.name || ''
  }
}
onMounted(() => document.addEventListener('click', outside))
onBeforeUnmount(() => document.removeEventListener('click', outside))
</script>
<template>
  <div ref="root" class="search-select">
    <div class="field">
      <input
        :value="search"
        :placeholder="placeholder"
        :disabled="disabled"
        @focus="focus"
        @input="input"
      /><button
        type="button"
        :disabled="disabled"
        @click="
          open = !open
          search = ''
        "
      >
        ⌄
      </button>
    </div>
    <div v-if="open && !disabled" class="choices">
      <button v-for="x in filtered" :key="x.id" type="button" @click="choose(x)">
        {{ x.name }}
      </button>
      <div v-if="!filtered.length" class="empty">No matching records</div>
    </div>
  </div>
</template>
<style scoped>
.search-select {
  position: relative;
  min-width: 0;
}
.field {
  display: flex;
  height: 36px;
  border: 1px solid #d6e0eb;
  border-radius: 9px;
  overflow: hidden;
}
.field input {
  flex: 1;
  min-width: 0;
  padding: 0 11px;
  border: 0;
  background: white;
  outline: 0;
  font: inherit;
}
.field button {
  border: 0;
  background: white;
  padding: 0 12px;
  cursor: pointer;
  color: #516e8b;
}
.choices {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  max-height: 235px;
  overflow: auto;
  background: white;
  box-shadow: 0 5px 20px #0002;
  border: 1px solid #dce3ea;
  border-radius: 8px;
}
.choices button {
  display: block;
  text-align: start;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  background: white;
  cursor: pointer;
  color: #123354;
}
.choices button:hover {
  background: #edf5fb;
}
.empty {
  padding: 14px;
  color: #8392a7;
}
</style>
