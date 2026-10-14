<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { COUNTRY_CODES } from '../constants/lookups'

const props = defineProps({
  mode: { type: String, default: 'create' }, // 'create' | 'edit'
  company: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
  banner: { type: String, default: '' },
})
const emit = defineEmits(['submit'])

const router = useRouter()
const isEdit = computed(() => props.mode === 'edit')

const form = reactive({
  name: '',
  email: '',
  country_code: '',
  phone: '',
  address: '',
  is_multi_contract: false,
  is_blacklist: false,
})

/* ---- Fill the form when editing ---- */
watch(
  () => props.company,
  (c) => {
    if (!c) return
    form.name = c.name ?? ''
    form.email = c.email ?? ''
    form.country_code = c.country_code ?? ''
    form.phone = c.phone ?? ''
    form.address = c.address ?? ''
    form.is_multi_contract = !!c.is_multi_contract
    form.is_blacklist = !!c.is_blacklist
  },
  { immediate: true },
)

/* ---- Select options ---- */
const codeOptions = computed(() =>
  form.country_code && !COUNTRY_CODES.some((c) => c.code === form.country_code)
    ? [{ label: 'Other', code: form.country_code }, ...COUNTRY_CODES]
    : COUNTRY_CODES,
)

/* ---- Errors ---- */
const localErrors = ref({})
const localBanner = ref('')
const allErrors = computed(() => ({ ...props.errors, ...localErrors.value }))
const err = (key) => allErrors.value[key]?.[0] ?? ''
const shownBanner = computed(() => localBanner.value || props.banner)

/* ---- Submit ---- */
function validate() {
  const e = {}
  if (!form.name.trim()) e.name = ['Company name is required.']
  if (!form.email) e.email = ['Email is required.']
  return e
}

function buildPayload() {
  const fd = new FormData()

  const put = (key, v, requiredField = false) => {
    if (typeof v === 'boolean') return fd.append(key, v ? 1 : 0)
    if (v === '' && (!isEdit.value || requiredField)) return
    fd.append(key, v)
  }

  Object.entries(form).forEach(([k, v]) => {
    put(k, v, k === 'name' || k === 'email')
  })
  return fd
}

function submit() {
  if (props.saving) return
  localErrors.value = {}
  localBanner.value = ''

  const e = validate()
  if (Object.keys(e).length) {
    localErrors.value = e
    localBanner.value = 'Please fix the highlighted fields.'
    return
  }
  emit('submit', buildPayload())
}

const back = () =>
  router.push(
    isEdit.value && props.company ? `/rent/customer-companies/${props.company.id}` : '/rent/customer-companies',
  )
</script>

<template>
  <div class="page">
    <div class="topbar">
      <button class="back" type="button" @click="back">
        ← {{ isEdit ? 'Back' : 'Companies' }}
      </button>
      <button class="btn-save" type="button" :disabled="saving" @click="submit">
        {{ saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save' }}
      </button>
    </div>

    <div class="card">
      <p v-if="shownBanner" class="banner">{{ shownBanner }}</p>

      <div class="panel">
        <section class="grid">
          <label class="field full">
            <span>Company Name</span>
            <input
              v-model="form.name"
              :class="{ bad: err('name') }"
              placeholder="Enter company name"
            />
            <small v-if="err('name')">{{ err('name') }}</small>
          </label>

          <label class="field full">
            <span>Email</span>
            <input
              v-model="form.email"
              type="email"
              :class="{ bad: err('email') }"
              placeholder="Enter email"
            />
            <small v-if="err('email')">{{ err('email') }}</small>
          </label>

          <label class="field">
            <span>Country Code</span>
            <select v-model="form.country_code" :class="{ bad: err('country_code') }">
              <option value="">Select country</option>
              <option v-for="c in codeOptions" :key="c.label" :value="c.code">
                {{ c.label }} ({{ c.code }})
              </option>
            </select>
            <small v-if="err('country_code')">{{ err('country_code') }}</small>
          </label>

          <label class="field">
            <span>Phone Number</span>
            <input
              v-model="form.phone"
              type="tel"
              :class="{ bad: err('phone') }"
              placeholder="Enter phone number"
            />
            <small v-if="err('phone')">{{ err('phone') }}</small>
          </label>

          <label class="field full">
            <span>Address (Country - State - Street)</span>
            <input
              v-model="form.address"
              :class="{ bad: err('address') }"
              placeholder="Enter address"
            />
            <small v-if="err('address')">{{ err('address') }}</small>
          </label>

          <div
            class="switch-card full"
            :class="{ on: form.is_multi_contract }"
            @click="form.is_multi_contract = !form.is_multi_contract"
          >
            <div>
              <strong>Multi Contract</strong>
              <p>Allow this company to hold more than one active contract at the same time.</p>
            </div>
            <button
              type="button"
              class="switch"
              role="switch"
              :aria-checked="form.is_multi_contract"
              @click.stop="form.is_multi_contract = !form.is_multi_contract"
            >
              <span />
            </button>
          </div>

          <div
            v-if="isEdit"
            class="switch-card full danger"
            :class="{ on: form.is_blacklist }"
            @click="form.is_blacklist = !form.is_blacklist"
          >
            <div>
              <strong>Black List</strong>
              <p>Mark this company as blacklisted.</p>
            </div>
            <button
              type="button"
              class="switch"
              role="switch"
              :aria-checked="form.is_blacklist"
              @click.stop="form.is_blacklist = !form.is_blacklist"
            >
              <span />
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 8px 4px 40px;
  color: #1f2937;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.back {
  background: none;
  border: 0;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
}
.back:hover {
  color: #1f2937;
}
.btn-save {
  height: 34px;
  padding: 0 28px;
  border: 0;
  border-radius: 999px;
  background: #4f93b8;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-save:hover:not(:disabled) {
  background: #3f83a8;
}
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 28px 24px 40px;
}

.banner {
  max-width: 560px;
  margin: 0 auto 20px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
}
.panel {
  max-width: 560px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 20px;
}
.full {
  grid-column: 1 / -1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.field > span {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.field input,
.field select {
  height: 38px;
  box-sizing: border-box;
  padding: 0 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.field input::placeholder {
  color: #9ca3af;
}
.field input:focus,
.field select:focus {
  border-color: #4f93b8;
  box-shadow: 0 0 0 3px rgba(79, 147, 184, 0.15);
}
.field .bad {
  border-color: #dc2626;
}
.field small {
  font-size: 12px;
  color: #dc2626;
}

.switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fafbfc;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.switch-card.on {
  border-color: #4f93b8;
  background: #f1f7fb;
}
.switch-card.on.danger {
  border-color: #dc2626;
  background: #fef2f2;
}
.switch-card strong {
  font-size: 14px;
}
.switch-card p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.switch {
  position: relative;
  flex: none;
  width: 44px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #d1d5db;
  cursor: pointer;
  transition: background 0.2s;
}
.switch span {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s;
}
.switch-card.on .switch {
  background: #4f93b8;
}
.switch-card.on.danger .switch {
  background: #dc2626;
}
.switch-card.on .switch span {
  transform: translateX(20px);
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
