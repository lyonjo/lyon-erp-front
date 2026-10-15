<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCustomerCompanies } from '@/composables/useCustomerCompanies'
const { t, te } = useI18n()
const tr = (value) => te(`rentUi.${value}`) ? t(`rentUi.${value}`) : value
const router = useRouter()
const { rows, meta, search, page, perPage, loading, error, fetchCustomerCompanies } = useCustomerCompanies()
onMounted(fetchCustomerCompanies)
const open = (row) => router.push(`/rent/customer-companies/${row.id}`)
const edit = (row) => router.push(`/rent/customer-companies/${row.id}/edit`)
const create = () => router.push('/rent/customer-companies/create')
</script>
<template>
  <div class="page">
    <h1 class="title">{{ tr('Manage Companies') }}</h1>
    <div class="toolbar">
      <div class="search-box"><input v-model="search" type="search" :placeholder="tr('Search')" :aria-label="tr('Search')" /></div>
      <select v-model.number="perPage" class="selector per-page" :aria-label="tr('per page')"><option v-for="n in [10,25,50,100]" :key="n" :value="n">{{ n }} {{ tr('per page') }}</option></select>
      <button class="btn-new" type="button" @click="create">+ {{ tr('New Company') }}</button>
    </div>
    <div v-if="error" class="api-error" role="alert">{{ error }}<button type="button" @click="fetchCustomerCompanies">{{ tr('Retry') }}</button></div>
    <div class="table-card" :class="{ loading }">
      <table><thead><tr><th class="left">{{ tr('ID') }}</th><th class="left">{{ tr('Company Name') }}</th><th class="left">{{ tr('Email') }}</th><th>{{ tr('Phone') }}</th><th>{{ tr('Black List') }}</th><th>{{ tr('Multi Contract') }}</th><th>{{ tr('Actions') }}</th></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id"><td class="left">{{ row.id }}</td><td class="left" dir="auto">{{ row.name }}</td><td class="left">{{ row.email || '—' }}</td><td dir="ltr">{{ row.phone || '—' }}</td>
          <td><span class="badge" :class="row.is_blacklist ? 'bad' : 'good'">{{ tr(row.is_blacklist ? 'Yes' : 'No') }}</span></td>
          <td><span class="badge" :class="row.is_multi_contract ? 'good' : 'bad'">{{ tr(row.is_multi_contract ? 'Yes' : 'No') }}</span></td>
          <td><div class="actions"><button class="action" @click="open(row)">{{ tr('View') }}</button><button class="action" @click="edit(row)">{{ tr('Edit') }}</button></div></td>
        </tr>
        <tr v-if="!loading && !error && !rows.length"><td class="empty" colspan="7">{{ tr('No companies found') }}</td></tr>
      </tbody></table>
    </div>
    <div class="pagination"><button :disabled="loading || page <= 1" @click="page--">{{ tr('Prev') }}</button><span dir="ltr">{{ meta.current_page }} / {{ meta.last_page }} ({{ meta.total }})</span><button :disabled="loading || page >= meta.last_page" @click="page++">{{ tr('Next') }}</button></div>
  </div>
</template>
<style scoped>
.page{padding:8px 4px 40px;color:#1f2937}.title{font-size:32px;font-weight:600;margin:0 0 28px;color:#1e2433}.toolbar{display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap}.search-box{position:relative;min-width:200px;width:300px}.search-box input{width:100%;height:36px;box-sizing:border-box;border:2px solid #9ca3af;border-radius:8px;padding:0 14px;background:#fff;font-size:14px}.selector{height:36px;padding:0 12px;border:2px solid #d1d5db;border-radius:8px;background:white;color:#6b7280}.per-page{margin-inline-start:auto}.btn-new,.btn-edit,.btn-save{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;background:#4f93b8;color:white;padding:9px 18px;cursor:pointer;font-size:14px}.btn-new:hover,.btn-edit:hover,.btn-save:hover{background:#3f83a8}.table-card{border:1px solid #e5e7eb;border-radius:14px;background:white;overflow-x:auto}.table-card.loading{opacity:.6}table{width:100%;min-width:700px;border-collapse:collapse}th,td{padding:14px 16px;text-align:center;font-size:14px;border-bottom:1px solid #eef0f3}th.left,td.left{text-align:start}th{color:#9ca3af;font-weight:500;font-size:13px}.badge{display:inline-block;min-width:36px;padding:3px 10px;border-radius:999px;font-size:12px}.good{color:#16a34a;background:#dcfce7}.bad{color:#dc2626;background:#fee2e2}.customer{background:#dbeafe;color:#2563eb}.company{background:#f3e8ff;color:#7e22ce}.actions{display:flex;gap:14px;justify-content:center}.action{border:0;background:transparent;color:#111827;cursor:pointer}.action:hover{color:#4f93b8}.empty{padding:32px;color:#6b7280;text-align:center}.pagination{display:flex;align-items:center;justify-content:center;gap:16px;padding:20px}.pagination button{padding:8px 16px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer}.pagination button:disabled{opacity:.5;cursor:not-allowed}.api-error{padding:14px 18px;margin-bottom:16px;border-radius:8px;background:#fef2f2;color:#b91c1c;display:flex;gap:12px;align-items:center;justify-content:space-between}.api-error button{background:white;border:1px solid #dc2626;border-radius:6px;padding:7px 12px;color:#b91c1c;cursor:pointer}.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.back{border:0;background:none;color:#6b7280;cursor:pointer}.card{border:1px solid #e5e7eb;border-radius:16px;background:#fff;padding:28px 24px;max-width:600px;margin:0 auto}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 20px}.full{grid-column:1/-1}.field{display:flex;flex-direction:column;gap:6px}.field>span{font-size:13px;font-weight:600}.field input,.field select{height:38px;border:1px solid #d1d5db;border-radius:8px;padding:0 12px;font:inherit}.field small{color:#dc2626}.switch-card{grid-column:1/-1;border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#fafbfc;display:flex;justify-content:space-between;align-items:center;gap:12px}.switch-card p{font-size:12px;color:#6b7280}.state{padding:40px;text-align:center;color:#6b7280}.detail-card{border:1px solid #e5e7eb;border-radius:16px;padding:24px;background:#fff;max-width:600px;margin:auto}.details{display:grid;grid-template-columns:1fr 1fr;gap:18px}.details dt{font-size:12px;color:#9ca3af}.details dd{margin:4px 0 0;font-size:14px}.banner{padding:10px 14px;background:#fef2f2;color:#b91c1c;border-radius:8px;margin-bottom:20px}@media(max-width:640px){.grid,.details{grid-template-columns:1fr}.toolbar>*{flex:1}.per-page{margin-inline-start:0}}
</style>
