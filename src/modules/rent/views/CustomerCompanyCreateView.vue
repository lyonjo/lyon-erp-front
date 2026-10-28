<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import CustomerCompanyForm from '../components/CustomerCompanyForm.vue'

const { t, te } = useI18n(),
  tr = (label) => t(`rentUi.${label}`)
const router = useRouter()

const saving = ref(false),
  errors = ref({}),
  banner = ref('')
function resolveCompanyId(response) {
  const d = response?.data
  return d?.data?.id ?? d?.customer_company?.id ?? d?.company?.id ?? d?.id ?? null
}
async function applyAttachments(id, files) {
  for (const file of files) {
    const body = new FormData()
    body.append('file', file)
    await api.post(`/rent/customer-companies/${id}/attachments`, body)
  }
}
async function save({ fd, attachments }) {
  if (saving.value) return
  saving.value = true
  errors.value = {}
  banner.value = ''
  try {
    const response = await api.post('/rent/customer-companies', fd)
    if (attachments.length) {
      const id = resolveCompanyId(response)
      if (!id) {
        banner.value =
          'Company was created, but attachments could not be uploaded because the create API did not return the company ID. Update the API response to include data.id.'
        return
      }
      try {
        await applyAttachments(id, attachments)
      } catch (uploadError) {
        banner.value =
          uploadError.response?.data?.message ||
          'Company created, but one or more attachments failed to upload. Open Edit to retry.'
        return
      }
    }
    router.push('/rent/customer-companies')
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = e.response.data.errors ?? {}
      banner.value = tr('Please fix the highlighted fields.')
    } else banner.value = e.response?.data?.message || tr('Something went wrong. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <CustomerCompanyForm
    mode="create"
    :saving="saving"
    :errors="errors"
    :banner="banner"
    @submit="save"
  />
</template>
<style scoped>
.page {
  padding: 8px 4px 40px;
  color: #1f2937;
}
.title {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 28px;
  color: #1e2433;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.search-box {
  position: relative;
  min-width: 200px;
  width: 300px;
}
.search-box input {
  width: 100%;
  height: 36px;
  box-sizing: border-box;
  border: 2px solid #9ca3af;
  border-radius: 8px;
  padding: 0 14px;
  background: #fff;
  font-size: 14px;
}
.selector {
  height: 36px;
  padding: 0 12px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #6b7280;
}
.per-page {
  margin-inline-start: auto;
}
.btn-new,
.btn-edit,
.btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: #4f93b8;
  color: white;
  padding: 9px 18px;
  cursor: pointer;
  font-size: 14px;
}
.btn-new:hover,
.btn-edit:hover,
.btn-save:hover {
  background: #3f83a8;
}
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: white;
  overflow-x: auto;
}
.table-card.loading {
  opacity: 0.6;
}
table {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
}
th,
td {
  padding: 14px 16px;
  text-align: center;
  font-size: 14px;
  border-bottom: 1px solid #eef0f3;
}
th.left,
td.left {
  text-align: start;
}
th {
  color: #9ca3af;
  font-weight: 500;
  font-size: 13px;
}
.badge {
  display: inline-block;
  min-width: 36px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
}
.good {
  color: #16a34a;
  background: #dcfce7;
}
.bad {
  color: #dc2626;
  background: #fee2e2;
}
.customer {
  background: #dbeafe;
  color: #2563eb;
}
.company {
  background: #f3e8ff;
  color: #7e22ce;
}
.actions {
  display: flex;
  gap: 14px;
  justify-content: center;
}
.action {
  border: 0;
  background: transparent;
  color: #111827;
  cursor: pointer;
}
.action:hover {
  color: #4f93b8;
}
.empty {
  padding: 32px;
  color: #6b7280;
  text-align: center;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
}
.pagination button {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.api-error {
  padding: 14px 18px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.api-error button {
  background: white;
  border: 1px solid #dc2626;
  border-radius: 6px;
  padding: 7px 12px;
  color: #b91c1c;
  cursor: pointer;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.back {
  border: 0;
  background: none;
  color: #6b7280;
  cursor: pointer;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 28px 24px;
  max-width: 600px;
  margin: 0 auto;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 20px;
}
.full {
  grid-column: 1/-1;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field > span {
  font-size: 13px;
  font-weight: 600;
}
.field input,
.field select {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  font: inherit;
}
.field small {
  color: #dc2626;
}
.switch-card {
  grid-column: 1/-1;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  background: #fafbfc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.switch-card p {
  font-size: 12px;
  color: #6b7280;
}
.state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}
.detail-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  background: #fff;
  max-width: 600px;
  margin: auto;
}
.details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.details dt {
  font-size: 12px;
  color: #9ca3af;
}
.details dd {
  margin: 4px 0 0;
  font-size: 14px;
}
.banner {
  padding: 10px 14px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  margin-bottom: 20px;
}
@media (max-width: 640px) {
  .grid,
  .details {
    grid-template-columns: 1fr;
  }
  .toolbar > * {
    flex: 1;
  }
  .per-page {
    margin-inline-start: 0;
  }
}
</style>
