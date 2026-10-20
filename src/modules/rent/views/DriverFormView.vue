<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const router = useRouter()
const route = useRoute()
const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const t = (en, arabic) => ar.value ? arabic : en
const editing = computed(() => Boolean(route.params.id))
const loading = ref(editing.value)
const saving = ref(false)
const error = ref('')
const errors = ref({})
const ready = ref(!editing.value)
const form = ref({ name: '', license_number: '', phone: '', email: '', status: true })

async function load() {
  if (!editing.value) return
  loading.value = true
  ready.value = false
  error.value = ''
  try {
    const { data } = await api.get(`/rent/drivers/${route.params.id}`)
    const driver = data.data
    form.value = {
      name: driver.name ?? '', license_number: driver.license_number ?? '',
      phone: driver.phone ?? '', email: driver.email ?? '', status: Boolean(driver.status),
    }
    ready.value = true
  } catch (e) {
    error.value = e.response?.data?.message || t('Could not load driver.', 'تعذر تحميل بيانات السائق.')
  } finally { loading.value = false }
}
onMounted(load)
async function save() {
  if (saving.value || loading.value || !ready.value) return
  saving.value = true
  error.value = ''
  errors.value = {}
  try {
    const payload = {
      ...form.value,
      name: form.value.name.trim(),
      license_number: form.value.license_number.trim(),
      phone: form.value.phone.trim() || null,
      email: form.value.email.trim() || null,
      status: form.value.status ? 1 : 0,
    }
    if (editing.value) await api.put(`/rent/drivers/${route.params.id}`, payload)
    else await api.post('/rent/drivers', payload)
    router.push('/rent/drivers')
  } catch (e) {
    if (e.response?.status === 422) errors.value = e.response.data?.errors || {}
    error.value = e.response?.data?.message || t('Unable to save driver.', 'تعذر حفظ السائق.')
  } finally { saving.value = false }
}
</script>

<template>
  <main class="form-page">
    <header class="heading">
      <h1>{{ editing ? t('Edit Driver', 'تعديل السائق') : t('Add Driver', 'إضافة سائق') }}</h1>
      <div class="head-actions"><button type="button" class="back" @click="router.push('/rent/drivers')">{{ t('Back', 'رجوع') }}</button><button type="submit" form="driver-form" class="primary" :disabled="loading || saving || !ready">{{ saving ? t('Saving...', 'جار الحفظ...') : editing ? t('Save Changes', 'حفظ التعديلات') : t('Add Driver', 'إضافة سائق') }}</button></div>
    </header>
    <section class="panel">
      <div v-if="loading" class="loading" role="status"><span class="spinner"></span>{{ t('Loading driver details...', 'جار تحميل بيانات السائق...') }}</div>
      <div v-else-if="!ready" class="loading"><p class="error">{{ error }}</p><button class="back" @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button></div>
      <form v-else id="driver-form" @submit.prevent="save" novalidate>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="fields">
          <div class="field"><label for="driver-name">{{ t('Driver Name', 'اسم السائق') }} *</label><input id="driver-name" v-model="form.name" required maxlength="255" :placeholder="t('Enter driver name', 'أدخل اسم السائق')" /><small v-if="errors.name" class="error">{{ errors.name[0] }}</small></div>
          <div class="field"><label for="license-number">{{ t('License Number', 'رقم الرخصة') }} *</label><input id="license-number" v-model="form.license_number" required maxlength="100" :placeholder="t('Enter license number', 'أدخل رقم الرخصة')" /><small v-if="errors.license_number" class="error">{{ errors.license_number[0] }}</small></div>
          <div class="field"><label for="driver-phone">{{ t('Phone Number', 'رقم الهاتف') }}</label><input id="driver-phone" v-model="form.phone" type="tel" maxlength="50" dir="ltr" :placeholder="t('Enter phone number', 'أدخل رقم الهاتف')" /><small v-if="errors.phone" class="error">{{ errors.phone[0] }}</small></div>
          <div class="field"><label for="driver-email">{{ t('Email', 'البريد الإلكتروني') }}</label><input id="driver-email" v-model="form.email" type="email" maxlength="255" dir="ltr" :placeholder="t('Enter email', 'أدخل البريد الإلكتروني')" /><small v-if="errors.email" class="error">{{ errors.email[0] }}</small></div>
          <div class="field"><label for="driver-status">{{ t('Status', 'الحالة') }}</label><select id="driver-status" v-model="form.status"><option :value="true">{{ t('Active', 'نشط') }}</option><option :value="false">{{ t('Inactive', 'غير نشط') }}</option></select><small v-if="errors.status" class="error">{{ errors.status[0] }}</small></div>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.form-page{padding:24px 28px;color:#15233b;font-family:'Segoe UI',Arial,sans-serif}.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:32px}.heading h1{font-size:26px;margin:0}.head-actions{display:flex;gap:10px}.primary,.back{cursor:pointer;border-radius:24px;padding:11px 24px;font-weight:600}.primary{background:#609fc7;color:white;border:0}.back{background:white;color:#15233b;border:1px solid #d7e0ec}.primary:disabled{opacity:.6;cursor:wait}.panel{border:1px solid #dbe2eb;border-radius:16px;background:#fff;padding:32px;min-height:220px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;max-width:900px;margin:auto}.field{display:flex;flex-direction:column;gap:8px}.field label{font-size:13px;font-weight:650}.field input,.field select{height:42px;border-radius:11px;border:1px solid #d1dae6;padding:0 14px;background:white;box-sizing:border-box;color:#192b44;font-size:14px;width:100%}.field input:focus,.field select:focus{outline:2px solid #aad3eb;outline-offset:1px}.error{color:#cd3030;font-size:13px}.loading{min-height:200px;display:flex;align-items:center;justify-content:center;gap:12px;flex-direction:column;color:#7c8fa6}.spinner{display:block;border:3px solid #dfecf3;border-top-color:#609fc7;width:27px;height:27px;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.form-page{padding:16px}.heading h1{font-size:21px}.fields{grid-template-columns:1fr}.panel{padding:20px}.heading{align-items:flex-start}}
</style>
