<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  items: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Search...' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])
const search = ref('')
const isOpen = ref(false)
const root = ref(null)

const selected = computed(() =>
  props.items.find((item) => String(item.id) === String(props.modelValue)),
)

const filtered = computed(() =>
  props.items
    .filter((item) =>
      String(item.name ?? '')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    )
    .slice(0, 80),
)

function syncSelectedLabel() {
  if (!isOpen.value) search.value = selected.value?.name ?? ''
}

watch(() => props.modelValue, syncSelectedLabel, { immediate: true })
watch(() => props.items, syncSelectedLabel)

function choose(item) {
  if (props.disabled) return
  emit('update:modelValue', item.id)
  search.value = item.name
  isOpen.value = false
}

function onInput(event) {
  if (props.disabled) return
  search.value = event.target.value
  isOpen.value = true
  emit('update:modelValue', '')
}

function onFocus() {
  if (props.disabled) return
  search.value = ''
  isOpen.value = true
}

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  search.value = isOpen.value ? '' : (selected.value?.name ?? '')
}

function onOutsideClick(event) {
  if (!root.value || root.value.contains(event.target)) return
  isOpen.value = false
  search.value = selected.value?.name ?? ''
}

onMounted(() => document.addEventListener('click', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))
</script>

<template>
  <div ref="root" class="search-select">
    <div class="field">
      <input
        :value="search"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        @focus="onFocus"
        @input="onInput"
      />
      <button type="button" :disabled="disabled" @click="toggleDropdown">⌄</button>
    </div>
    <div v-if="isOpen && !disabled" class="choices">
      <button v-for="item in filtered" :key="item.id" type="button" @click="choose(item)">
        {{ item.name }}
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
