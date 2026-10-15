<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n({ useScope: 'global' })
import { onMounted, ref } from 'vue'
import api from '@/api'
import CompanyModal from '../components/CompanyModal.vue'
import ProtectedImage from '@/components/ProtectedImage.vue'

const companies = ref([])
const loading = ref(false)
const error = ref('')
const modalOpen = ref(false)
const selected = ref(null)
const saving = ref(false)
const formErrors = ref({})
const formError = ref('')
const deletingId = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/companies')
    companies.value = data.data ?? []
  } catch (e) {
    error.value = e.response?.data?.message || t('companies.unableLoad')
  } finally {
    loading.value = false
  }
}
onMounted(load)

function add() {
  selected.value = null
  formError.value = ''
  formErrors.value = {}
  modalOpen.value = true
}
function edit(company) {
  selected.value = company
  formError.value = ''
  formErrors.value = {}
  modalOpen.value = true
}

async function save(fd) {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  formErrors.value = {}
  try {
    if (selected.value) {
      fd.append('_method', 'PUT')
      await api.post(`/rent/companies/${selected.value.id}`, fd)
    } else {
      await api.post('/rent/companies', fd)
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    if (e.response?.status === 422) {
      formErrors.value = e.response.data?.errors ?? {}
      formError.value = e.response.data?.message || t('companies.fixFields')
    } else {
      formError.value = e.response?.data?.message || t('companies.unableSave')
    }
  } finally {
    saving.value = false
  }
}

async function remove(company) {
  if (deletingId.value !== null) return
  if (!window.confirm(t('companies.deleteConfirm', { name: company.name }))) return
  deletingId.value = company.id
  error.value = ''
  try {
    await api.delete(`/rent/companies/${company.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || t('companies.unableDelete')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="page">
    <div class="heading">
      <h1>{{ t('companies.title') }}</h1>
      <button class="new-button" type="button" @click="add">{{ t('companies.new') }}</button>
    </div>
    <div v-if="error" class="error" role="alert">
      {{ error }} <button type="button" @click="load">{{ t('common.retry') }}</button>
    </div>
    <p v-if="loading && !companies.length" class="state">{{ t('companies.loading') }}</p>
    <p v-else-if="!loading && !companies.length && !error" class="state">
      {{ t('companies.empty') }}
    </p>
    <div class="cards" :class="{ muted: loading }">
      <article v-for="company in companies" :key="company.id" class="card">
        <div class="image-panel">
          <ProtectedImage
            v-if="company.logo_url"
            :endpoint="`/rent/companies/${company.id}/logo`"
            :alt="`${company.name} logo`"
          />
          <span v-else class="no-logo">{{ t('companies.noLogo') }}</span>
          <div class="actions">
            <button type="button" class="edit" @click="edit(company)">
              ✎ {{ t('companies.edit') }}
            </button>
            <button
              type="button"
              class="delete"
              :disabled="deletingId !== null"
              @click="remove(company)"
            >
              {{ deletingId === company.id ? t('companies.deleting') : t('companies.delete') }}
            </button>
          </div>
        </div>
        <div class="details">
          <div class="name" dir="auto">{{ company.name }}</div>
          <div class="location" dir="auto">{{ company.location }}</div>
          <span v-if="company.is_main" class="main-label">{{ t('companies.main') }}</span>
        </div>
      </article>
    </div>
    <CompanyModal
      :open="modalOpen"
      :company="selected"
      :saving="saving"
      :errors="formErrors"
      :error="formError"
      @close="modalOpen = false"
      @submit="save"
    />
  </div>
</template>

<style scoped>
.page {
  padding: 8px 4px 48px;
  color: #101b2b;
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 44px;
}
.heading h1 {
  font-size: 32px;
  font-weight: 650;
  margin: 0;
}
.new-button {
  border: 0;
  border-radius: 999px;
  background: #5a9ec9;
  color: white;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 24px;
  cursor: pointer;
  box-shadow: 0 2px 5px #0001;
}
.new-button:hover {
  background: #488db8;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 48px 5%;
  align-items: start;
}
.cards.muted {
  opacity: 0.7;
}
.card {
  border: 1px solid #dbe1e8;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 5px #00000012;
}
.image-panel {
  position: relative;
  background: #f3f4f6;
  aspect-ratio: 2.1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-panel img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.no-logo {
  color: #9ca3af;
  font-size: 14px;
}
.actions {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.68);
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.17s;
}
.card:hover .actions,
.card:focus-within .actions {
  opacity: 1;
}
.actions button {
  border: 0;
  border-radius: 999px;
  padding: 10px 20px;
  cursor: pointer;
  color: white;
  font-weight: 600;
}
.edit {
  background: #5a9ec9;
}
.delete {
  background: #d84040;
}
.actions button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.details {
  padding: 22px 24px 20px;
  min-height: 88px;
}
.name {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}
.location {
  color: #64748b;
  font-size: 13px;
  margin-top: 2px;
}
.main-label {
  display: inline-block;
  margin-top: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #075985;
  font-size: 11px;
  font-weight: 650;
}
.state {
  padding: 30px 0;
  color: #64748b;
}
.error {
  display: flex;
  gap: 15px;
  align-items: center;
  justify-content: space-between;
  background: #fef2f2;
  padding: 14px 18px;
  color: #b91c1c;
  border-radius: 8px;
  margin: 0 0 22px;
}
.error button {
  border: 1px solid #b91c1c;
  background: white;
  color: #b91c1c;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
@media (max-width: 1100px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
  }
}
@media (max-width: 650px) {
  .heading {
    margin-bottom: 24px;
  }
  .heading h1 {
    font-size: 25px;
  }
  .new-button {
    padding: 9px 13px;
  }
  .cards {
    grid-template-columns: 1fr;
  }
}
@media (hover: none) {
  .actions {
    opacity: 1;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
    align-items: flex-end;
    padding-bottom: 12px;
    box-sizing: border-box;
  }
}
</style>
