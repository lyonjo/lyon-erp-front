<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const bookingId = computed(() => route.params.id)
const record = ref(null)
const loading = ref(true)
const error = ref('')
const docError = ref('')
const loadingDocuments = ref(false)
const documents = ref({})
const imageUrls = ref({})
const uploadBusy = ref('')
const openImage = ref('')

const docSpecs = [
  { type: 'license', en: 'Driver License', ar: 'رخصة القيادة' },
  { type: 'id_passport', en: 'ID / Passport', ar: 'الهوية / جواز السفر' },
  { type: 'flight_ticket', en: 'Flight Ticket', ar: 'تذكرة الطيران' },
]

const customer = computed(() => record.value?.customer || null)
const customerCompany = computed(() => record.value?.customer_company || null)
// Customer company bookings do not display or load uploaded documents.
const showDocuments = computed(
  () => !record.value?.customer_company_id && !!record.value?.customer_id,
)
const personName = computed(
  () =>
    customer.value?.name ||
    customerCompany.value?.name ||
    customerCompany.value?.company_name ||
    '—',
)
const phone = computed(() => {
  const entry = customer.value || customerCompany.value || {}
  return [entry.country_code, entry.phone_number || entry.phone].filter(Boolean).join(' ') || '—'
})
const carName = computed(() => {
  const booking = record.value || {}
  const price = booking.rental_price || {}
  const car = booking.car || {}
  return (
    [
      price.brand?.name || car.brand?.name,
      price.model?.name || car.model?.name,
      price.model_year || car.model_year,
    ]
      .filter(Boolean)
      .join(' ') || '—'
  )
})
const extraNames = computed(
  () => (record.value?.extra_items || []).map((item) => item.name).join(' · ') || '—',
)
const tenantCurrency = ref('JOD')
const currency = computed(() => record.value?.currency || tenantCurrency.value)
const countryFromCurrency = computed(() => {
  const code = String(tenantCurrency.value || '').toUpperCase()
  const names = {
    JOD: ['Jordan', 'الأردن'],
    USD: ['United States', 'الولايات المتحدة'],
    EUR: ['Eurozone', 'منطقة اليورو'],
    SAR: ['Saudi Arabia', 'السعودية'],
    AED: ['United Arab Emirates', 'الإمارات العربية المتحدة'],
    EGP: ['Egypt', 'مصر'],
    KWD: ['Kuwait', 'الكويت'],
    QAR: ['Qatar', 'قطر'],
    BHD: ['Bahrain', 'البحرين'],
    OMR: ['Oman', 'عُمان'],
  }
  return names[code] ? tr(...names[code]) : '—'
})
const money = (value) => `${Number(value || 0).toFixed(2)} ${currency.value}`
const dateLabel = (value) => (value ? String(value).slice(0, 10) : '—')
const textValue = (value) => (value === null || value === undefined || value === '' ? '—' : value)
const serviceText = computed(() =>
  record.value?.service === 'rent'
    ? tr('Rent a Car', 'تأجير سيارة')
    : textValue(record.value?.service),
)
const customerRows = computed(() => [
  [tr('Customer / Company Name', 'اسم العميل / الشركة'), personName.value],
  [tr('Phone Number', 'رقم الهاتف'), phone.value],
  [tr('Email', 'البريد الإلكتروني'), customer.value?.email || customerCompany.value?.email],
  [tr('Service Type', 'نوع الخدمة'), serviceText.value],
  [tr('Car Type', 'نوع السيارة'), carName.value],
  [tr('Country', 'الدولة'), countryFromCurrency.value],
])
const rentalRows = computed(() => [
  [tr('Start Date', 'تاريخ البداية'), dateLabel(record.value?.start_date)],
  [tr('Start Time', 'وقت البداية'), record.value?.start_time],
  [tr('Return Date', 'تاريخ العودة'), dateLabel(record.value?.end_date)],
  [tr('Return Time', 'وقت العودة'), record.value?.end_time],
  [tr('Pickup Location', 'مكان الاستلام'), record.value?.pick_up_location],
  [tr('Drop-off Location', 'مكان التسليم'), record.value?.return_location],
  [tr('Number of Days', 'عدد الأيام'), record.value?.total_days],
  [tr('Vehicle Number', 'رقم السيارة'), record.value?.car?.number],
  [tr('Extra Items', 'الإضافات'), extraNames.value],
])
const priceRows = computed(() => [
  [tr('Daily Rental Price', 'سعر الإيجار اليومي'), money(record.value?.day_price)],
  [tr('Extra Items', 'الإضافات'), money(record.value?.extra_charge)],
  [tr('Branch Fee', 'رسوم الفرع'), money(record.value?.branch_fee)],
  [tr('Tax', 'الضريبة'), money(record.value?.tax)],
  [
    tr('Payment Method', 'طريقة الدفع'),
    record.value?.payment_method === 'cash'
      ? tr('Cash', 'نقداً')
      : textValue(record.value?.payment_method),
  ],
  [tr('Total Price', 'السعر الإجمالي'), money(record.value?.total)],
])

function clearImages() {
  Object.values(imageUrls.value).forEach((url) => URL.revokeObjectURL(url))
  imageUrls.value = {}
}

async function fetchImage(type, endpoint) {
  try {
    const response = await api.get(endpoint, { responseType: 'blob' })
    if (!response.data?.type?.startsWith('image/')) return false
    const old = imageUrls.value[type]
    imageUrls.value[type] = URL.createObjectURL(response.data)
    if (old) URL.revokeObjectURL(old)
    return true
  } catch {
    return false
  }
}

async function loadDocuments() {
  loadingDocuments.value = true
  docError.value = ''
  clearImages()
  try {
    const { data } = await api.get(`/rent/bookings/${bookingId.value}/documents`)
    documents.value = data.data || {}
    await Promise.all(
      docSpecs.map(async ({ type }) => {
        if (documents.value[type]?.exists) {
          await fetchImage(type, `/rent/bookings/${bookingId.value}/documents/${type}`)
          return
        }
        // Show the existing customer profile image unless a booking-specific override exists.
        if (!customer.value?.id || type === 'flight_ticket') return
        const keys =
          type === 'license'
            ? ['license_front', 'license_back']
            : ['id_front', 'passport', 'id_back']
        for (const key of keys) {
          const loaded = await fetchImage(
            type,
            `/rent/customers/${customer.value.id}/documents/${key}`,
          )
          if (loaded) {
            documents.value[type] = { exists: false, inherited: true, name: key }
            break
          }
        }
      }),
    )
  } catch (e) {
    docError.value =
      e.response?.data?.message || tr('Could not load documents.', 'تعذر تحميل المستندات.')
  } finally {
    loadingDocuments.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  record.value = null
  clearImages()
  try {
    const { data } = await api.get(`/rent/bookings/${bookingId.value}`)
    record.value = data.data
    try {
      const settingsResponse = await api.get('/rent/settings')
      tenantCurrency.value = settingsResponse.data?.data?.currency || 'JOD'
    } catch {
      tenantCurrency.value = 'JOD'
    }
    if (showDocuments.value) {
      await loadDocuments()
    } else {
      documents.value = {}
      docError.value = ''
    }
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Could not load booking details.', 'تعذر تحميل تفاصيل الحجز.')
  } finally {
    loading.value = false
  }
}

async function onFileChange(type, event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || uploadBusy.value) return
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
    docError.value = tr(
      'Choose a JPG, PNG or WEBP image up to 5 MB.',
      'اختر صورة JPG أو PNG أو WEBP بحجم لا يتجاوز 5 ميجابايت.',
    )
    return
  }
  uploadBusy.value = type
  docError.value = ''
  const form = new FormData()
  form.append('image', file)
  try {
    await api.post(`/rent/bookings/${bookingId.value}/documents/${type}`, form)
    if (showDocuments.value) {
      await loadDocuments()
    } else {
      documents.value = {}
      docError.value = ''
    }
  } catch (e) {
    docError.value = e.response?.data?.message || tr('Unable to upload image.', 'تعذر رفع الصورة.')
  } finally {
    uploadBusy.value = ''
  }
}

function showImage(type) {
  if (!imageUrls.value[type]) return
  openImage.value = type
}

watch(bookingId, load, { immediate: true })
onBeforeUnmount(clearImages)
</script>

<template>
  <main class="booking-detail" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <header class="topbar">
      <div>
        <h1>{{ tr('Booking Details', 'تفاصيل الحجز') }}</h1>
        <p v-if="record" class="subtitle">#{{ record.id }} · {{ textValue(record.status) }}</p>
      </div>
      <button class="back" type="button" @click="router.push('/rent/booking')">
        <span aria-hidden="true">{{ locale === 'ar' ? '→' : '←' }}</span>
        {{ tr('Back to Bookings', 'العودة إلى الحجوزات') }}
      </button>
    </header>

    <div v-if="loading" class="state" role="status">
      {{ tr('Loading booking details...', 'جاري تحميل تفاصيل الحجز...') }}
    </div>
    <div v-else-if="error" class="state error">
      {{ error }}
      <button class="retry" type="button" @click="load">{{ tr('Retry', 'إعادة المحاولة') }}</button>
    </div>

    <div v-else-if="record" class="cards">
      <section class="panel">
        <h2>{{ tr('Customer Details', 'بيانات العميل') }}</h2>
        <dl>
          <div v-for="[label, value] in customerRows" :key="label" class="detail-row">
            <dt>{{ label }} :</dt>
            <dd dir="auto">{{ textValue(value) }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <h2>{{ tr('Rental Details', 'تفاصيل الإيجار') }}</h2>
        <dl>
          <div v-for="[label, value] in rentalRows" :key="label" class="detail-row">
            <dt>{{ label }} :</dt>
            <dd dir="auto">{{ textValue(value) }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <h2>{{ tr('Price Details', 'تفاصيل الأسعار') }}</h2>
        <dl>
          <div v-for="[label, value] in priceRows" :key="label" class="detail-row">
            <dt>{{ label }} :</dt>
            <dd :class="{ emphasized: label === tr('Total Price', 'السعر الإجمالي') }" dir="auto">
              {{ textValue(value) }}
            </dd>
          </div>
        </dl>
      </section>

      <section v-if="showDocuments" class="panel documents-panel">
        <h2>{{ tr('Uploaded Documents', 'المستندات المرفوعة') }}</h2>
        <p class="docs-note">
          {{
            tr(
              'View or replace documents. License and ID/passport changes update the linked customer or customer company profile.',
              'عرض المستندات أو استبدالها. يتم تحديث الرخصة والهوية في ملف العميل أو شركة العميل المرتبطة.',
            )
          }}
        </p>
        <p v-if="docError" class="doc-error">{{ docError }}</p>
        <div v-if="loadingDocuments" class="docs-note">
          {{ tr('Loading documents...', 'جاري تحميل المستندات...') }}
        </div>
        <div v-for="spec in docSpecs" :key="spec.type" class="document-row">
          <div class="document-name">
            <strong>{{ tr(spec.en, spec.ar) }}</strong>
            <small v-if="documents[spec.type]?.inherited">{{
              tr('From customer profile', 'من ملف العميل')
            }}</small>
            <small v-else-if="documents[spec.type]?.exists">{{ tr('Uploaded', 'مرفوع') }}</small>
            <small v-else>{{ tr('No image uploaded', 'لا توجد صورة') }}</small>
          </div>
          <div class="document-buttons">
            <button
              v-if="imageUrls[spec.type]"
              type="button"
              class="plain-action"
              @click="showImage(spec.type)"
            >
              {{ tr('View Image', 'عرض الصورة') }}
            </button>
            <label class="upload-action" :class="{ disabled: !!uploadBusy }">
              {{
                uploadBusy === spec.type
                  ? tr('Saving...', 'جاري الحفظ...')
                  : imageUrls[spec.type]
                    ? tr('Replace', 'استبدال')
                    : tr('Upload', 'رفع')
              }}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                :disabled="!!uploadBusy"
                @change="onFileChange(spec.type, $event)"
              />
            </label>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="showDocuments && openImage && imageUrls[openImage]"
      class="overlay"
      role="dialog"
      aria-modal="true"
      @click.self="openImage = ''"
    >
      <div class="image-dialog">
        <button class="close" type="button" @click="openImage = ''">✕</button>
        <img :src="imageUrls[openImage]" :alt="openImage" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.booking-detail {
  color: #0c2341;
  padding: 18px 20px 40px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 22px;
}
h1 {
  font-size: 27px;
  margin: 0;
  font-weight: 700;
}
.subtitle {
  margin: 6px 0 0;
  color: #8796aa;
  font-size: 13px;
}
.back,
.retry {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #d6e0ea;
  border-radius: 999px;
  padding: 10px 17px;
  background: #fff;
  color: #193657;
  cursor: pointer;
}
.back:hover,
.retry:hover {
  background: #edf6fb;
  border-color: #74a4c6;
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.panel {
  border: 1px solid #d8e0e8;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  min-width: 0;
}
h2 {
  font-size: 15px;
  font-weight: 650;
  margin: 0;
  padding: 17px 20px;
  border-bottom: 1px solid #e0e6ec;
}
dl {
  margin: 0;
}
.detail-row {
  display: grid;
  grid-template-columns: 42% 58%;
  align-items: center;
  min-height: 39px;
  border-bottom: 1px solid #e5e9ee;
  font-size: 13px;
}
.detail-row:last-child {
  border-bottom: 0;
}
dt {
  padding: 10px 20px;
  color: #667b97;
}
dd {
  margin: 0;
  padding: 10px 20px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.emphasized {
  font-weight: 750;
  color: #102a4d;
}
.docs-note {
  margin: 0;
  padding: 11px 20px;
  color: #8090a5;
  font-size: 12px;
}
.doc-error {
  margin: 8px 20px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff1f2;
  color: #b42336;
  font-size: 13px;
}
.document-row {
  min-height: 75px;
  border-top: 1px solid #e5e9ee;
  padding: 11px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.document-name {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
}
.document-name small {
  color: #8b99ad;
  font-size: 11px;
}
.document-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.plain-action,
.remove-action {
  background: transparent;
  border: 0;
  cursor: pointer;
  color: #356d9b;
  font-size: 12px;
}
.remove-action {
  color: #c43747;
}
.upload-action {
  display: inline-flex;
  align-items: center;
  padding: 7px 13px;
  background: #6ca1c3;
  color: #fff;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
}
.upload-action input {
  display: none;
}
.upload-action.disabled {
  opacity: 0.55;
  pointer-events: none;
}
.state {
  border: 1px solid #e0e6ee;
  background: #fff;
  border-radius: 12px;
  padding: 65px 25px;
  text-align: center;
  color: #71809a;
}
.state.error {
  color: #b42336;
}
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0009;
  padding: 25px;
}
.image-dialog {
  background: #fff;
  border-radius: 12px;
  padding: 30px 18px 18px;
  position: relative;
  max-width: min(900px, 95vw);
  max-height: 90vh;
}
.image-dialog img {
  display: block;
  max-width: 100%;
  max-height: 75vh;
  object-fit: contain;
}
.close {
  position: absolute;
  top: 6px;
  right: 9px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
@media (max-width: 850px) {
  .cards {
    grid-template-columns: 1fr;
  }
  .booking-detail {
    padding: 14px 10px;
  }
}
@media (max-width: 520px) {
  .detail-row {
    grid-template-columns: 45% 55%;
  }
  .document-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
