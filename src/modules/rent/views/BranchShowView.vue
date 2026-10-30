<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute()
const router = useRouter()
const { locale } = useI18n({ useScope: 'global' })
const tr = (en, ar) => locale.value.startsWith('ar') ? ar : en
const id = computed(() => route.params.id)
const branch = ref(null)
const destinations = ref([])
const error = ref('')
const loading = ref(true)
const search = ref('')
const perPage = ref(50)
const page = ref(1)
const filtered = computed(() => destinations.value.filter(d => (d.destination_branch?.name || '').toLowerCase().includes(search.value.toLowerCase())))
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const visible = computed(() => filtered.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
const money = v => Number.isFinite(Number(v)) ? Math.round(Number(v)).toString() : '—'
async function load() {
  try {
    const [b,d] = await Promise.all([api.get(`/rent/branches/${id.value}`), api.get(`/rent/branches/${id.value}/destinations`)])
    branch.value = b.data.data
    destinations.value = d.data.data ?? []
  } catch (e) { error.value = e.response?.data?.message || tr('Could not load branch.', 'تعذر تحميل الفرع.') }
  finally { loading.value = false }
}
onMounted(load)
</script>
<template>
  <section class="branch-view">
    <header class="head"><h1>{{ tr('Branch Details', 'تفاصيل الفرع') }}</h1><button class="secondary" type="button" @click="router.push('/rent/branches')">{{ tr('Back to Branches', 'العودة للفروع') }}</button></header>
    <p v-if="error" class="error">{{ error }}</p>
    <template v-if="!loading && branch"><section class="panel"><h2>{{ branch.name }}</h2><div class="details"><div><small>{{ tr('Branch ID', 'رقم الفرع') }}</small><p>{{ branch.id }}</p></div><div><small>{{ tr('Address', 'العنوان') }}</small><p>{{ branch.address || '—' }}</p></div></div></section>
      <section class="panel"><h2>{{ tr('Branch Destinations', 'وجهات الفرع') }}</h2><div class="toolbar" dir="ltr"><input v-model="search" type="search" :placeholder="tr('Search destinations...', 'البحث عن الوجهات...')" @input="page=1"/><select v-model.number="perPage" @change="page=1"><option v-for="n in [10,25,50,100]" :key="n" :value="n">{{ n }} {{ tr('per page', 'لكل صفحة') }}</option></select><span></span></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>{{ tr('Destination Branch', 'الفرع الوجهة') }}</th><th>{{ tr('Price', 'السعر') }}</th></tr></thead><tbody><tr v-for="row in visible" :key="row.id"><td>{{ row.id }}</td><td>{{ row.destination_branch?.name || '—' }}</td><td>{{ money(row.price) }}</td></tr><tr v-if="!visible.length"><td colspan="3">{{ tr('No destinations found.', 'لا توجد وجهات.') }}</td></tr></tbody></table></div><div class="pager" dir="ltr"><button :disabled="page <= 1" @click="page--">‹</button><button v-for="n in pages" :key="n" :class="{active:page===n}" @click="page=n">{{ n }}</button><button :disabled="page >= pages" @click="page++">›</button></div></section>
    </template>
  </section>
</template>
<style scoped>
.branch-view{padding:16px 22px 50px;color:#102342}.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:12px}.head h1{font-size:28px;margin:0}.secondary{border:1px solid #d1dce6;background:#fff;border-radius:25px;padding:10px 18px;cursor:pointer}.panel{border:1px solid #dce4ed;border-radius:14px;background:#fff;padding:24px;margin-bottom:18px}.panel h2{font-size:19px;margin:0 0 18px}.details{display:grid;grid-template-columns:1fr 1fr;gap:20px}.details small{color:#8292a5}.details p{margin:6px 0}.toolbar{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;gap:12px;margin:0 0 18px}.toolbar input,.toolbar select{border:1px solid #cbd5e1;background:white;border-radius:9px;padding:10px;color:#20334f}.toolbar input{justify-self:start;max-width:320px;width:100%}.toolbar select{justify-self:center}.table-wrap{border:1px solid #dce4ed;border-radius:12px;overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:center;padding:14px;border-bottom:1px solid #e7edf4}tr:last-child td{border:0}th{color:#8292a5;font-size:12px}.pager{display:flex;justify-content:center;gap:7px;margin-top:18px}.pager button{border:1px solid #e3e9f1;border-radius:100%;background:#f5f7fa;height:35px;width:35px;cursor:pointer}.pager button.active{background:#3983ef;color:white;border-color:#3983ef}.error{color:#be3546}@media(max-width:700px){.details,.toolbar{grid-template-columns:1fr}.head{flex-wrap:wrap}.toolbar input,.toolbar select{justify-self:stretch;max-width:none}}
</style>
