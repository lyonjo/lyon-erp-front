<script setup>
import { useI18n } from 'vue-i18n'
const { t, te } = useI18n()
const tr = (label) => (te(`rentUi.${label}`) ? t(`rentUi.${label}`) : label)

import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import DocUpload from './DocUpload.vue'
import { CLIENT_SIDES } from '../constants/lookups'
import CountrySearchSelect from './CountrySearchSelect.vue'
import { countryOptions, dialingOptions } from '../constants/allCountries'
import { toDate } from '../utils/files'

const props = defineProps({
  mode: { type: String, default: 'create' }, // 'create' | 'edit'
  customer: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
  banner: { type: String, default: '' },
})
const emit = defineEmits(['submit'])

const router = useRouter()
const isEdit = computed(() => props.mode === 'edit')

/* ---- Field names: match CustomerRequest ---- */
const DOCS = {
  id: [
    { key: 'id_front', label: 'From The Front' },
    { key: 'id_back', label: 'From The Back' },
    { key: 'passport', label: 'Passport Photo' },
  ],
  license: [
    { key: 'license_front', label: 'From The Front' },
    { key: 'license_back', label: 'From The Back' },
  ],
}
const DOC_KEYS = [...DOCS.id, ...DOCS.license].map((d) => d.key)

const tabs = [
  { id: 'info', label: 'Customer Info' },
  { id: 'nationality', label: 'Nationality' },
  { id: 'license', label: 'License' },
  { id: 'documents', label: 'Uploaded documents' },
]
const tab = ref('info')

const form = reactive({
  name: '',
  email: '',
  client_side: '',
  country_code: '',
  phone_number: '',
  address: '',
  is_multi_contract: false,
  is_blacklist: false,
})
const details = reactive({
  nationality: '',
  place_of_birth: '',
  date_of_birth: '',
  passport_place_of_issue: '',
  passport_date_of_issue: '',
  passport_date_of_expire: '',
  license_no: '',
  license_place_of_issue: '',
  license_date_of_issue: '',
  license_date_of_expire: '',
})
const files = reactive(Object.fromEntries(DOC_KEYS.map((k) => [k, null])))

/* ---- Fill the form when editing ---- */
watch(
  () => props.customer,
  (c) => {
    if (!c) return
    form.name = c.name ?? ''
    form.email = c.email ?? ''
    form.client_side = c.client_side ?? ''
    form.country_code = c.country_code ?? ''
    form.phone_number = c.phone_number ?? ''
    form.address = c.address ?? ''
    form.is_multi_contract = !!c.is_multi_contract
    form.is_blacklist = !!c.is_blacklist
    Object.keys(details).forEach((k) => {
      const v = c.details?.[k] ?? ''
      details[k] = k.includes('date') ? toDate(v) : v
    })
  },
  { immediate: true },
)

const existingEndpoints = computed(() => {
  const c = props.customer
  if (!c?.id) return {}
  return Object.fromEntries(
    DOC_KEYS.map((key) => [key, c.images?.[key] ? `/rent/customers/${c.id}/documents/${key}` : '']),
  )
})

/* ---- Toggles ---- */
const toggles = computed(() => [
  {
    key: 'is_multi_contract',
    title: 'Multi Contract',
    text: 'Allow this customer to hold more than one active contract at the same time.',
  },
  ...(isEdit.value
    ? [
        {
          key: 'is_blacklist',
          title: 'Black List',
          text: 'Mark this customer as blacklisted.',
          danger: true,
        },
      ]
    : []),
])

/* ---- Detail fields ---- */
const maxBirth = new Date(Date.now() - 86400000).toISOString().slice(0, 10) // backend: before today
const nationalityFields = [
  {
    key: 'passport_place_of_issue',
    label: 'Passport Place of Issue',
    placeholder: 'Enter passport place of issue',
    full: true,
  },
  { key: 'passport_date_of_issue', label: 'Passport Date of Issue', type: 'date' },
  {
    key: 'passport_date_of_expire',
    label: 'Passport Date of Expire',
    type: 'date',
    minFrom: 'passport_date_of_issue',
  },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', max: maxBirth },
  { key: 'place_of_birth', label: 'Place of Birth', placeholder: 'Enter place of birth' },
]
const licenseFields = [
  { key: 'license_date_of_issue', label: 'License Date of Issue', type: 'date' },
  {
    key: 'license_date_of_expire',
    label: 'License Date of Expire',
    type: 'date',
    minFrom: 'license_date_of_issue',
  },
  { key: 'license_no', label: 'License No.', placeholder: 'Enter license number' },
  {
    key: 'license_place_of_issue',
    label: 'License Place of Issue',
    placeholder: 'Enter license place of issue',
  },
]

/* ---- Errors: server (422) + local ---- */
const localErrors = ref({})
const localBanner = ref('')
const allErrors = computed(() => ({ ...props.errors, ...localErrors.value }))
const err = (key) => allErrors.value[key]?.[0] ?? ''
const shownBanner = computed(() => localBanner.value || props.banner)

function tabOf(key) {
  if (DOC_KEYS.includes(key)) return 'documents'
  if (key.startsWith('details.license')) return 'license'
  if (key.startsWith('details.')) return 'nationality'
  return 'info'
}
const tabsWithErrors = computed(() => new Set(Object.keys(allErrors.value).map(tabOf)))

watch(
  () => props.errors,
  (e) => {
    const first = Object.keys(e)[0]
    if (first) tab.value = tabOf(first)
  },
)

/* ---- Submit ---- */
function validate() {
  const e = {}
  if (!form.name.trim()) e.name = [tr('Customer name is required.')]
  if (!form.client_side) e.client_side = [tr('Please select a client side.')]
  for (const key of ['id_front', 'license_front']) {
    if (!files[key] && !existingEndpoints.value[key]) {
      e[key] = [
        tr(key === 'id_front' ? 'Front ID photo is required.' : 'Front license photo is required.'),
      ]
    }
  }
  return e
}

function buildPayload() {
  const fd = new FormData()

  // create: skip empty values. edit: send them so a field can be cleared.
  const put = (key, v, requiredField = false) => {
    if (typeof v === 'boolean') return fd.append(key, v ? 1 : 0)
    if (v === '' && (!isEdit.value || requiredField)) return
    fd.append(key, v)
  }

  Object.entries(form).forEach(([k, v]) => {
    if (k === 'is_blacklist' && !isEdit.value) return
    put(k, v, k === 'name' || k === 'client_side')
  })
  Object.entries(details).forEach(([k, v]) => put(`details[${k}]`, v))
  DOC_KEYS.forEach((k) => files[k] && fd.append(k, files[k]))
  return fd
}

function submit() {
  if (props.saving) return
  localErrors.value = {}
  localBanner.value = ''

  const e = validate()
  if (Object.keys(e).length) {
    localErrors.value = e
    localBanner.value = tr('Please fix the highlighted fields.')
    tab.value = Object.keys(e).some((key) => DOC_KEYS.includes(key)) ? 'documents' : 'info'
    return
  }
  emit('submit', buildPayload())
}

const back = () =>
  router.push(
    isEdit.value && props.customer ? `/rent/customers/${props.customer.id}` : '/rent/customers',
  )
</script>

<template>
  <div class="page">
    <div class="topbar">
      <button class="back" type="button" @click="back">
        ← {{ isEdit ? tr('Back') : tr('Customers') }}
      </button>
      <button class="btn-save" type="button" :disabled="saving" @click="submit">
        {{ saving ? tr('Saving…') : isEdit ? tr('Save changes') : tr('Save') }}
      </button>
    </div>

    <div class="card">
      <nav class="tabs">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="tab"
          :class="{ active: tab === t.id }"
          @click="tab = t.id"
        >
          {{ tr(t.label) }}
          <i v-if="tabsWithErrors.has(t.id)" class="dot" />
        </button>
      </nav>

      <p v-if="shownBanner" class="banner">{{ shownBanner }}</p>

      <div class="panel">
        <!-- Customer info -->
        <section v-show="tab === 'info'" class="grid">
          <label class="field full">
            <span>{{ tr('Customer Name') }}</span>
            <input
              v-model="form.name"
              :class="{ bad: err('name') }"
              :placeholder="tr('Enter customer name')"
            />
            <small v-if="err('name')">{{ err('name') }}</small>
          </label>

          <label class="field full">
            <span>{{ tr('Email') }}</span>
            <input
              v-model="form.email"
              type="email"
              :class="{ bad: err('email') }"
              :placeholder="tr('Enter email')"
            />
            <small v-if="err('email')">{{ err('email') }}</small>
          </label>

          <label class="field full">
            <span>{{ tr('Client Side') }}</span>
            <select v-model="form.client_side" :class="{ bad: err('client_side') }">
              <option value="" disabled>{{ tr('Select client type') }}</option>
              <option v-for="c in CLIENT_SIDES" :key="c.value" :value="c.value">
                {{ tr(c.label) }}
              </option>
            </select>
            <small v-if="err('client_side')">{{ err('client_side') }}</small>
          </label>

          <label class="field">
            <span>{{ tr('Country Code') }}</span>
            <CountrySearchSelect
              v-model="form.country_code"
              :options="dialingOptions"
              :placeholder="tr('Search country or calling code...')"
              :invalid="!!err('country_code')"
            />
            <small v-if="err('country_code')">{{ err('country_code') }}</small>
          </label>

          <label class="field">
            <span>{{ tr('Phone Number') }}</span>
            <input
              v-model="form.phone_number"
              type="tel"
              :class="{ bad: err('phone_number') }"
              :placeholder="tr('Enter phone number')"
            />
            <small v-if="err('phone_number')">{{ err('phone_number') }}</small>
          </label>

          <label class="field full">
            <span>{{ tr('Address (Country - State - Street)') }}</span>
            <input
              v-model="form.address"
              :class="{ bad: err('address') }"
              :placeholder="tr('Enter address')"
            />
            <small v-if="err('address')">{{ err('address') }}</small>
          </label>

          <div
            v-for="t in toggles"
            :key="t.key"
            class="switch-card full"
            :class="{ on: form[t.key], danger: t.danger }"
            @click="form[t.key] = !form[t.key]"
          >
            <div>
              <strong>{{ tr(t.title) }}</strong>
              <p>{{ tr(t.text) }}</p>
            </div>
            <button
              type="button"
              class="switch"
              role="switch"
              :aria-checked="form[t.key]"
              @click.stop="form[t.key] = !form[t.key]"
            >
              <span />
            </button>
          </div>
        </section>

        <!-- Nationality -->
        <section v-show="tab === 'nationality'" class="grid">
          <label class="field full">
            <span>{{ tr('Nationality') }}</span>
            <CountrySearchSelect
              v-model="details.nationality"
              :options="countryOptions"
              :placeholder="tr('Search nationality or country...')"
              :invalid="!!err('details.nationality')"
            />
            <small v-if="err('details.nationality')">{{ err('details.nationality') }}</small>
          </label>

          <label
            v-for="f in nationalityFields"
            :key="f.key"
            class="field"
            :class="{ full: f.full }"
          >
            <span>{{ tr(f.label) }}</span>
            <input
              v-model="details[f.key]"
              :type="f.type || 'text'"
              :placeholder="f.placeholder ? tr(f.placeholder) : undefined"
              :min="f.minFrom ? details[f.minFrom] || undefined : undefined"
              :max="f.max"
              :class="{ bad: err('details.' + f.key) }"
            />
            <small v-if="err('details.' + f.key)">{{ err('details.' + f.key) }}</small>
          </label>
        </section>

        <!-- License -->
        <section v-show="tab === 'license'" class="grid">
          <label v-for="f in licenseFields" :key="f.key" class="field">
            <span>{{ tr(f.label) }}</span>
            <input
              v-model="details[f.key]"
              :type="f.type || 'text'"
              :placeholder="f.placeholder ? tr(f.placeholder) : undefined"
              :min="f.minFrom ? details[f.minFrom] || undefined : undefined"
              :class="{ bad: err('details.' + f.key) }"
            />
            <small v-if="err('details.' + f.key)">{{ err('details.' + f.key) }}</small>
          </label>
        </section>

        <!-- Documents -->
        <section v-show="tab === 'documents'" class="docs">
          <div>
            <h3>{{ tr('ID Photo') }}</h3>
            <div class="doc-stack">
              <DocUpload
                v-for="d in DOCS.id"
                :key="d.key"
                v-model="files[d.key]"
                :label="
                  ['id_front', 'license_front'].includes(d.key) ? `${tr(d.label)} *` : tr(d.label)
                "
                :error="err(d.key)"
                :existing-endpoint="existingEndpoints[d.key]"
              />
            </div>
          </div>
          <div>
            <h3>{{ tr('License Photo') }}</h3>
            <div class="doc-stack">
              <DocUpload
                v-for="d in DOCS.license"
                :key="d.key"
                v-model="files[d.key]"
                :label="
                  ['id_front', 'license_front'].includes(d.key) ? `${tr(d.label)} *` : tr(d.label)
                "
                :error="err(d.key)"
                :existing-endpoint="existingEndpoints[d.key]"
              />
            </div>
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

.tabs {
  display: flex;
  justify-content: center;
  gap: 36px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
.tab {
  position: relative;
  background: none;
  border: 0;
  padding: 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: #9ca3af;
  cursor: pointer;
}
.tab:hover {
  color: #6b7280;
}
.tab.active {
  color: #111827;
}
.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 2px;
  border-radius: 2px;
  background: #4f93b8;
}
.dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 6px;
  border-radius: 50%;
  background: #dc2626;
  vertical-align: middle;
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

.docs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}
.docs h3 {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
}
.doc-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 640px) {
  .grid,
  .docs {
    grid-template-columns: 1fr;
  }
  .tabs {
    gap: 20px;
  }
}
</style>
