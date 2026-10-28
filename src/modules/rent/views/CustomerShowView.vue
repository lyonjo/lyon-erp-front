<script setup>
import { useI18n } from 'vue-i18n'
const { t, te } = useI18n()
const tr = (label) => (te(`rentUi.${label}`) ? t(`rentUi.${label}`) : label)

import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toDate } from '../utils/files'
import ProtectedImage from '@/components/ProtectedImage.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const c = ref(null)
const loading = ref(true)
const error = ref('')

watch(
  () => route.params.id,
  async (id, _oldId, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    c.value = null
    error.value = ''
    loading.value = true
    try {
      const { data } = await api.get(`/rent/customers/${encodeURIComponent(id)}`, {
        signal: controller.signal,
      })
      if (!controller.signal.aborted) c.value = data.data
    } catch (e) {
      if (!controller.signal.aborted) {
        error.value =
          e.response?.status === 404
            ? tr('Customer not found.')
            : tr('Could not load this customer.')
      }
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  },
  { immediate: true },
)

const d = computed(() => c.value?.details ?? {})
const infoRows = computed(() => [
  ['Email', c.value?.email],
  ['Phone', [c.value?.country_code, c.value?.phone_number].filter(Boolean).join(' ')],
  ['Client Side', c.value?.client_side_label ?? c.value?.client_side],
  ['Address', c.value?.address],
])
const nationalityRows = computed(() => [
  ['Nationality', d.value.nationality],
  ['Date of Birth', toDate(d.value.date_of_birth)],
  ['Place of Birth', d.value.place_of_birth],
  ['Passport Place of Issue', d.value.passport_place_of_issue],
  ['Passport Date of Issue', toDate(d.value.passport_date_of_issue)],
  ['Passport Date of Expire', toDate(d.value.passport_date_of_expire)],
])
const licenseRows = computed(() => [
  ['License No.', d.value.license_no],
  ['License Place of Issue', d.value.license_place_of_issue],
  ['License Date of Issue', toDate(d.value.license_date_of_issue)],
  ['License Date of Expire', toDate(d.value.license_date_of_expire)],
])
const docGroups = [
  {
    title: 'ID Photo',
    items: [
      ['From The Front', 'id_front'],
      ['From The Back', 'id_back'],
      ['Passport Photo', 'passport'],
    ],
  },
  {
    title: 'License Photo',
    items: [
      ['From The Front', 'license_front'],
      ['From The Back', 'license_back'],
    ],
  },
]
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v)
const documentEndpoint = (key) =>
  c.value?.id ? `/rent/customers/${c.value.id}/documents/${key}` : ''
</script>

<template>
  <div class="page">
    <div class="topbar">
      <button class="back" type="button" @click="router.push('/rent/customers')">
        ← Customers
      </button>
    </div>
    <p v-if="loading" class="state">{{ tr('Loading\u2026') }}</p>
    <p v-else-if="error" class="state">{{ error }}</p>
    <template v-else-if="c">
      <header class="head">
        <div>
          <h1 dir="auto">{{ c.name }}</h1>
          <span class="id">ID #{{ c.id }}</span>
        </div>
        <div class="badges">
          <span class="badge" :class="c.is_blacklist ? 'bad' : 'good'"
            >{{ tr('Black List') }}: {{ tr(c.is_blacklist ? 'Yes' : 'No') }}</span
          >
          <span class="badge" :class="c.is_multi_contract ? 'good' : 'bad'"
            >{{ tr('Multi Contract') }}: {{ tr(c.is_multi_contract ? 'Yes' : 'No') }}</span
          >
        </div>
      </header>
      <section class="card">
        <h2>{{ tr('Customer Info') }}</h2>
        <dl class="rows">
          <div v-for="[label, value] in infoRows" :key="label">
            <dt>{{ tr(label) }}</dt>
            <dd dir="auto">{{ dash(value) }}</dd>
          </div>
        </dl>
      </section>
      <section class="card">
        <h2>{{ tr('Nationality & Passport') }}</h2>
        <dl class="rows">
          <div v-for="[label, value] in nationalityRows" :key="label">
            <dt>{{ tr(label) }}</dt>
            <dd dir="auto">{{ dash(value) }}</dd>
          </div>
        </dl>
      </section>
      <section class="card">
        <h2>{{ tr('License') }}</h2>
        <dl class="rows">
          <div v-for="[label, value] in licenseRows" :key="label">
            <dt>{{ tr(label) }}</dt>
            <dd dir="auto">{{ dash(value) }}</dd>
          </div>
        </dl>
      </section>
      <section class="card">
        <h2>{{ tr('Uploaded documents') }}</h2>
        <div class="doc-groups">
          <div v-for="g in docGroups" :key="g.title">
            <h3>{{ tr(g.title) }}</h3>
            <div class="tiles">
              <figure v-for="[label, key] in g.items" :key="key">
                <div v-if="c.images?.[key]" class="tile">
                  <ProtectedImage :endpoint="documentEndpoint(key)" :alt="tr(label)" />
                </div>
                <div v-else class="tile empty">{{ tr('Not uploaded') }}</div>
                <figcaption>{{ tr(label) }}</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  padding: 8px 4px 40px;
  color: #1f2937;
  max-width: 900px;
  margin: 0 auto;
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
.btn-edit {
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
.btn-edit:hover {
  background: #3f83a8;
}
.state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.head h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #1e2433;
}
.id {
  font-size: 13px;
  color: #9ca3af;
}
.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}
.badge.good {
  background: #dcfce7;
  color: #16a34a;
}
.badge.bad {
  background: #fee2e2;
  color: #dc2626;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  padding: 20px 24px;
  margin-bottom: 16px;
}
.card h2 {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
}
.rows {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
  margin: 0;
}
.rows dt {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 2px;
}
.rows dd {
  margin: 0;
  font-size: 14px;
  color: #111827;
  word-break: break-word;
}
.doc-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}
.doc-groups h3 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
figure {
  margin: 0;
}
figcaption {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}
.tile {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 110px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafbfc;
  overflow: hidden;
}
.tile.empty {
  border-style: dashed;
  font-size: 12px;
  color: #9ca3af;
}
@media (max-width: 640px) {
  .rows,
  .doc-groups {
    grid-template-columns: 1fr;
  }
}
</style>
