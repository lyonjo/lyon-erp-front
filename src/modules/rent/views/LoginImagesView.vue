<script setup>
import { computed, ref, onMounted, onScopeDispose } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import TenantLoginImage from '@/components/TenantLoginImage.vue'
// These must point to the SAME bundled defaults your current LoginView imports.
// Adjust these TWO imports if your files live under a different folder.
import defaultLogo from '@/assets/logo.png'
import defaultIllustration from '@/assets/login-illustration.png'

const { locale } = useI18n({ useScope: 'global' })
const isAr = computed(() => locale.value.startsWith('ar'))
const labels = {
  en: {
    title: 'Edit Login Page', desc: 'Customize login images for this company only.',
    logo: 'Login logo', illustration: 'Login illustration',
    defaults: 'Using default image', override: 'Custom image active',
    select: 'Choose image', save: 'Save image', reset: 'Restore default',
    size: 'JPG, PNG or WebP · maximum 4 MB',
    saving: 'Saving...', loading: 'Loading...',
    success: 'Image updated successfully.', resetSuccess: 'Default image restored.',
    failed: 'Operation failed. Please try again.', invalid: 'Choose a valid JPG, PNG or WebP image up to 4 MB.',
    confirmation: 'Restore the default image for this section?', cancel: 'Cancel',
    noFile: 'Choose an image first.', retry: 'Retry',
  },
  ar: {
    title: 'تعديل صفحة تسجيل الدخول', desc: 'تخصيص صور تسجيل الدخول لهذه الشركة فقط.',
    logo: 'شعار تسجيل الدخول', illustration: 'صورة صفحة تسجيل الدخول',
    defaults: 'يتم استخدام الصورة الافتراضية', override: 'صورة مخصصة مفعّلة',
    select: 'اختيار صورة', save: 'حفظ الصورة', reset: 'استعادة الافتراضية',
    size: 'JPG أو PNG أو WebP · بحد أقصى 4 ميغابايت',
    saving: 'جارٍ الحفظ...', loading: 'جارٍ التحميل...',
    success: 'تم تحديث الصورة بنجاح.', resetSuccess: 'تمت استعادة الصورة الافتراضية.',
    failed: 'فشلت العملية. يرجى المحاولة مرة أخرى.', invalid: 'اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 4 ميغابايت.',
    confirmation: 'هل تريد استعادة الصورة الافتراضية لهذا القسم؟', cancel: 'إلغاء',
    noFile: 'اختر صورة أولاً.', retry: 'إعادة المحاولة',
  },
}
const t = (key) => labels[isAr.value ? 'ar' : 'en'][key]

const slots = [
  { id: 'logo', defaultSrc: defaultLogo },
  { id: 'illustration', defaultSrc: defaultIllustration },
]
const selected = ref({ logo: null, illustration: null })
const previews = ref({ logo: '', illustration: '' })
const overrides = ref({ logo: false, illustration: false })
const revisions = ref({ logo: 0, illustration: 0 })
const busy = ref({ logo: false, illustration: false })
const initialLoading = ref(true)
const fetchError = ref('')
const notice = ref('')
const fileInputs = ref({})

function clearLocalPreview(slot) {
  if (previews.value[slot]) URL.revokeObjectURL(previews.value[slot])
  previews.value[slot] = ''
  selected.value[slot] = null
  if (fileInputs.value[slot]) fileInputs.value[slot].value = ''
}

function chooseFile(slot, event) {
  const file = event.target.files?.[0]
  clearLocalPreview(slot)
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
    notice.value = t('invalid')
    return
  }
  selected.value[slot] = file
  previews.value[slot] = URL.createObjectURL(file)
  notice.value = ''
}

async function fetchStatus() {
  initialLoading.value = true
  fetchError.value = ''
  try {
    const { data } = await api.get(`/login-branding?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } })
    overrides.value = {
      logo: Boolean(data?.data?.logo),
      illustration: Boolean(data?.data?.illustration),
    }
  } catch (e) {
    fetchError.value = t('failed')
  } finally {
    initialLoading.value = false
  }
}

async function save(slot) {
  const file = selected.value[slot]
  if (!file || busy.value[slot]) { if (!file) notice.value = t('noFile'); return }
  busy.value[slot] = true
  notice.value = ''
  try {
    const form = new FormData()
    form.append('image', file)
    // POST avoids relying on PUT multipart parsing; endpoint uses update() action.
    await api.post(`/rent/login-branding/${slot}`, form)
    overrides.value[slot] = true
    revisions.value[slot] += 1
    clearLocalPreview(slot)
    notice.value = t('success')
  } catch (e) {
    notice.value = e?.response?.data?.message || t('failed')
  } finally {
    busy.value[slot] = false
  }
}

async function reset(slot) {
  if (busy.value[slot] || !window.confirm(t('confirmation'))) return
  busy.value[slot] = true
  notice.value = ''
  try {
    await api.delete(`/rent/login-branding/${slot}`)
    overrides.value[slot] = false
    revisions.value[slot] += 1
    clearLocalPreview(slot)
    notice.value = t('resetSuccess')
  } catch (e) {
    notice.value = e?.response?.data?.message || t('failed')
  } finally {
    busy.value[slot] = false
  }
}

onMounted(fetchStatus)
onScopeDispose(() => slots.forEach((s) => clearLocalPreview(s.id)))
</script>

<template>
  <section class="branding-page">
    <header class="page-header">
      <h1>{{ t('title') }}</h1>
      <p>{{ t('desc') }}</p>
    </header>

    <div v-if="notice" role="status" class="notice">{{ notice }}</div>
    <div v-if="fetchError" class="notice error">
      {{ fetchError }} <button type="button" @click="fetchStatus">{{ t('retry') }}</button>
    </div>
    <div v-if="initialLoading" class="loading">{{ t('loading') }}</div>

    <div class="branding-grid">
      <article v-for="item in slots" :key="item.id" class="branding-card">
        <div class="card-heading">
          <h2>{{ t(item.id) }}</h2>
          <span class="status" :class="{ active: overrides[item.id] }">
            {{ overrides[item.id] ? t('override') : t('defaults') }}
          </span>
        </div>
        <div class="preview" :class="item.id">
          <img v-if="previews[item.id]" :src="previews[item.id]" :alt="t(item.id)" />
          <TenantLoginImage v-else :slot="item.id" :fallback-src="item.defaultSrc" :revision="revisions[item.id]" :alt="t(item.id)" />
        </div>
        <p class="hint">{{ t('size') }}</p>
        <input :ref="(el) => { if (el) fileInputs[item.id] = el }" type="file"
               accept="image/jpeg,image/png,image/webp" class="hidden-input"
               @change="chooseFile(item.id, $event)" />
        <div class="buttons">
          <button class="secondary" type="button" :disabled="busy[item.id]" @click="fileInputs[item.id]?.click()">{{ t('select') }}</button>
          <button class="primary" type="button" :disabled="!selected[item.id] || busy[item.id]" @click="save(item.id)">
            {{ busy[item.id] ? t('saving') : t('save') }}
          </button>
          <button class="reset" type="button" :disabled="!overrides[item.id] || busy[item.id]" @click="reset(item.id)">{{ t('reset') }}</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.branding-page{width:100%;padding:32px 26px 52px;box-sizing:border-box;color:#11233e}
.page-header{text-align:start;margin:0 0 30px}.page-header h1{font-size:29px;font-weight:700;margin:0 0 8px}.page-header p{font-size:14px;color:#8b99b5;margin:0}
.branding-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.branding-card{background:#fff;border:1px solid #e2e7f0;border-radius:16px;padding:22px;box-shadow:0 2px 7px rgba(30,58,90,.05)}
.card-heading{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}
.card-heading h2{margin:0;font-size:18px}.status{border-radius:20px;background:#f2f5f9;color:#66758c;padding:7px 12px;font-size:12px}.status.active{background:#e2f3fc;color:#2876a2}
.preview{height:290px;display:flex;align-items:center;justify-content:center;border:1px dashed #cbd8e6;background:#fafbfd;border-radius:12px;overflow:hidden}
.preview img{display:block;max-height:100%;max-width:100%;object-fit:contain}.preview.logo img{max-width:75%;max-height:65%}.preview.illustration img{max-width:100%;max-height:100%}
.hint{font-size:12px;color:#8c98ab;margin:14px 0}.hidden-input{display:none}
.buttons{display:flex;flex-wrap:wrap;gap:10px}.buttons button{border-radius:24px;padding:10px 17px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #cbd8e5;transition:.15s}
.buttons button:hover:not(:disabled){filter:brightness(.97)}.buttons button:disabled{opacity:.5;cursor:not-allowed}
.primary{background:#5c9fc8;color:white;border-color:#5c9fc8!important}.secondary{background:#fff;color:#264866}.reset{background:#fff;color:#a33f44;border-color:#efc9cb!important}
.notice{margin-bottom:18px;padding:13px 16px;background:#e8f4fc;border:1px solid #cce8f9;border-radius:10px;color:#205b80}.notice.error{background:#fff1f2;color:#ad3945}.notice button{margin-inline-start:12px;background:transparent;color:inherit;border:0;text-decoration:underline;cursor:pointer}
.loading{color:#71829a;margin-bottom:14px}
@media(max-width:850px){.branding-grid{grid-template-columns:1fr}.branding-page{padding:20px 14px}.preview{height:240px}}
</style>
