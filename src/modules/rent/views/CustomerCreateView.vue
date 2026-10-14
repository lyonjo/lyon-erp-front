<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import DocUpload from '../components/DocUpload.vue'
import { COUNTRY_CODES, NATIONALITIES, CLIENT_SIDES } from '../constants/lookups'

const router = useRouter()

/* ---- Field names: match them with CustomerRequest ---- */
const DOCS = {
  id: [
    { key: 'id_front', label: 'From The Front', required: true },
    { key: 'id_back', label: 'From The Back', required: true },
    { key: 'passport', label: 'Passport Photo', required: true },
  ],
  license: [
    { key: 'license_front', label: 'From The Front', required: true },
    { key: 'license_back', label: 'From The Back', required: true },
  ],
}
const DOC_KEYS = [...DOCS.id, ...DOCS.license].map((d) => d.key)
const REQUIRED_DOCS = [...DOCS.id, ...DOCS.license].filter((d) => d.required)
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
})
const details = reactive({
  nationality: '',
  id_number: '',
  passport_place_of_issue: '',
  passport_date_of_issue: '',
  passport_date_of_expire: '',
  date_of_birth: '',
  place_of_birth: '',
  license_no: '',
  license_date_of_issue: '',
  license_date_of_expire: '',
  license_place_of_issue: '',
})
const files = reactive(Object.fromEntries(DOC_KEYS.map((k) => [k, null])))

/* ---- Validation errors from Laravel (422) ---- */
const errors = ref({})
const banner = ref('')
const saving = ref(false)

const err = (key) => errors.value[key]?.[0] ?? ''

function tabOf(key) {
  if (DOC_KEYS.includes(key)) return 'documents'
  if (key.startsWith('details.license')) return 'license'
  if (key.startsWith('details.')) return 'nationality'
  return 'info'
}
const tabsWithErrors = computed(() => new Set(Object.keys(errors.value).map(tabOf)))

/* ---- Submit ---- */
function buildPayload() {
  const fd = new FormData()
  Object.entries(form).forEach(([k, v]) => {
    if (typeof v === 'boolean') fd.append(k, v ? 1 : 0)
    else if (v !== '') fd.append(k, v)
  })
  Object.entries(details).forEach(([k, v]) => v !== '' && fd.append(`details[${k}]`, v))
  DOC_KEYS.forEach((k) => files[k] && fd.append(k, files[k]))
  return fd
}

async function save() {
  if (saving.value) return
  saving.value = true
  errors.value = {}
  banner.value = ''

  try {
    await api.post('/rent/customers', buildPayload(), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    router.push('/rent/customers')
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = e.response.data.errors ?? {}
      const first = Object.keys(errors.value)[0]
      if (first) tab.value = tabOf(first)
      banner.value = 'Please fix the highlighted fields.'
    } else {
      banner.value = e.response?.data?.message || 'Something went wrong. Please try again.'
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="topbar">
      <button class="back" type="button" @click="router.push('/rent/customers')">
        ← Customers
      </button>
      <button class="btn-save" type="button" :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>

    <div class="card">
      <!-- Tabs -->
      <nav class="tabs">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="tab"
          :class="{ active: tab === t.id }"
          @click="tab = t.id"
        >
          {{ t.label }}
          <i v-if="tabsWithErrors.has(t.id)" class="dot" />
        </button>
      </nav>

      <p v-if="banner" class="banner">{{ banner }}</p>

      <div class="panel">
        <!-- Customer info -->
        <section v-show="tab === 'info'" class="grid">
          <label class="field full">
            <span>Customer Name</span>
            <input
              v-model="form.name"
              :class="{ bad: err('name') }"
              placeholder="Enter customer name"
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

          <label class="field full">
            <span>Client Side</span>
            <select v-model="form.client_side" :class="{ bad: err('client_side') }">
              <option value="" disabled>Select client type</option>
              <option v-for="c in CLIENT_SIDES" :key="c.value" :value="c.value">
                {{ c.label }}
              </option>
            </select>
            <small v-if="err('client_side')">{{ err('client_side') }}</small>
          </label>

          <label class="field">
            <span>Country Code</span>
            <select v-model="form.country_code" :class="{ bad: err('country_code') }">
              <option value="" disabled>Select country</option>
              <option v-for="c in COUNTRY_CODES" :key="c.label" :value="c.code">
                {{ c.label }} ({{ c.code }})
              </option>
            </select>
            <small v-if="err('country_code')">{{ err('country_code') }}</small>
          </label>

          <label class="field">
            <span>Phone Number</span>
            <input
              v-model="form.phone_number"
              type="tel"
              :class="{ bad: err('phone_number') }"
              placeholder="Enter phone number"
            />
            <small v-if="err('phone_number')">{{ err('phone_number') }}</small>
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

          <!-- Multi contract switch -->
          <div
            class="switch-card full"
            :class="{ on: form.is_multi_contract }"
            @click="form.is_multi_contract = !form.is_multi_contract"
          >
            <div>
              <strong>Multi Contract</strong>
              <p>Allow this customer to hold more than one active contract at the same time.</p>
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
        </section>

        <!-- Nationality -->
        <section v-show="tab === 'nationality'" class="grid">
          <label class="field full">
            <span>Nationality</span>
            <select v-model="details.nationality" :class="{ bad: err('details.nationality') }">
              <option value="" disabled>Select nationality</option>
              <option v-for="n in NATIONALITIES" :key="n" :value="n">{{ n }}</option>
            </select>
            <small v-if="err('details.nationality')">{{ err('details.nationality') }}</small>
          </label>

          <label class="field">
            <span>Passport Place of Issue</span>
            <input
              v-model="details.passport_place_of_issue"
              :class="{ bad: err('details.passport_place_of_issue') }"
              placeholder="Enter passport place of issue"
            />
            <small v-if="err('details.passport_place_of_issue')">{{
              err('details.passport_place_of_issue')
            }}</small>
          </label>

          <label class="field">
            <span>ID Number</span>
            <input
              v-model="details.id_number"
              :class="{ bad: err('details.id_number') }"
              placeholder="Enter ID number"
            />
            <small v-if="err('details.id_number')">{{ err('details.id_number') }}</small>
          </label>

          <label class="field">
            <span>Passport Date of Issue</span>
            <input
              v-model="details.passport_date_of_issue"
              type="date"
              :class="{ bad: err('details.passport_date_of_issue') }"
            />
            <small v-if="err('details.passport_date_of_issue')">{{
              err('details.passport_date_of_issue')
            }}</small>
          </label>

          <label class="field">
            <span>Passport Date of Expire</span>
            <input
              v-model="details.passport_date_of_expire"
              type="date"
              :class="{ bad: err('details.passport_date_of_expire') }"
            />
            <small v-if="err('details.passport_date_of_expire')">{{
              err('details.passport_date_of_expire')
            }}</small>
          </label>

          <label class="field">
            <span>Date of Birth</span>
            <input
              v-model="details.date_of_birth"
              type="date"
              :class="{ bad: err('details.date_of_birth') }"
            />
            <small v-if="err('details.date_of_birth')">{{ err('details.date_of_birth') }}</small>
          </label>

          <label class="field">
            <span>Place of Birth</span>
            <input
              v-model="details.place_of_birth"
              :class="{ bad: err('details.place_of_birth') }"
              placeholder="Enter place of birth"
            />
            <small v-if="err('details.place_of_birth')">{{ err('details.place_of_birth') }}</small>
          </label>
        </section>

        <!-- License -->
        <section v-show="tab === 'license'" class="grid">
          <label class="field">
            <span>License Date of Issue</span>
            <input
              v-model="details.license_date_of_issue"
              type="date"
              :class="{ bad: err('details.license_date_of_issue') }"
            />
            <small v-if="err('details.license_date_of_issue')">{{
              err('details.license_date_of_issue')
            }}</small>
          </label>

          <label class="field">
            <span>License Date of Expire</span>
            <input
              v-model="details.license_date_of_expire"
              type="date"
              :class="{ bad: err('details.license_date_of_expire') }"
            />
            <small v-if="err('details.license_date_of_expire')">{{
              err('details.license_date_of_expire')
            }}</small>
          </label>

          <label class="field">
            <span>License No.</span>
            <input
              v-model="details.license_no"
              :class="{ bad: err('details.license_no') }"
              placeholder="Enter license number"
            />
            <small v-if="err('details.license_no')">{{ err('details.license_no') }}</small>
          </label>

          <label class="field">
            <span>License Place of Issue</span>
            <input
              v-model="details.license_place_of_issue"
              :class="{ bad: err('details.license_place_of_issue') }"
              placeholder="Enter license place of issue"
            />
            <small v-if="err('details.license_place_of_issue')">{{
              err('details.license_place_of_issue')
            }}</small>
          </label>
        </section>

        <!-- Documents -->
        <section v-show="tab === 'documents'" class="docs">
          <div>
            <h3>ID Photo</h3>
            <div class="doc-stack">
              <DocUpload
                v-for="d in DOCS.id"
                :key="d.key"
                v-model="files[d.key]"
                :label="d.label"
                :error="err(d.key)"
              />
            </div>
          </div>
          <div>
            <h3>License Photo</h3>
            <div class="doc-stack">
              <DocUpload
                v-for="d in DOCS.license"
                :key="d.key"
                v-model="files[d.key]"
                :label="d.label"
                :error="err(d.key)"
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

/* Tabs */
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

/* Form grid */
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

/* Multi-contract switch */
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
.switch-card.on .switch span {
  transform: translateX(20px);
}

/* Documents */
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
