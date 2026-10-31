<script setup>
import { reactive, ref, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n({ useScope: 'global' })
const arabic = computed(() => locale.value?.toLowerCase().startsWith('ar'))
const tr = (en, ar) => (arabic.value ? ar : en)
const form = reactive({
  customer_name: '',
  pickup_date: '',
  pickup_time: '',
  from: '',
  to: '',
  flight_ticket: '',
  driver: '',
  vehicle: '',
  vehicle_no: '',
  font: 13,
})
const busy = ref(false)
const error = ref('')
const validation = ref({})
let pdfUrl = null

async function viewManifest() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  validation.value = {}
  // Open synchronously on click to avoid browser popup blocking after an async API call.
  const tab = window.open('', '_blank')
  try {
    const result = await api.post(
      '/rent/manifest',
      { ...form, format: 'pdf' },
      { responseType: 'blob' },
    )
    const blob = new Blob([result.data], { type: 'application/pdf' })
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    pdfUrl = URL.createObjectURL(blob)
    if (tab) tab.location.href = pdfUrl
    else {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = 'manifest.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  } catch (err) {
    if (tab) tab.close()
    const response = err?.response
    if (response?.data instanceof Blob && response.data.type?.includes('json')) {
      try {
        const payload = JSON.parse(await response.data.text())
        validation.value = payload.errors || {}
        error.value = payload.message || tr('Failed to generate manifest.', 'تعذر إنشاء البيان.')
      } catch {
        error.value = tr('Failed to generate manifest.', 'تعذر إنشاء البيان.')
      }
    } else {
      error.value = tr('Failed to generate manifest.', 'تعذر إنشاء البيان.')
    }
  } finally {
    busy.value = false
  }
}
onBeforeUnmount(() => {
  if (pdfUrl) URL.revokeObjectURL(pdfUrl)
})
</script>

<template>
  <section class="manifest-page">
    <h1>{{ tr('Manifest', 'بيان') }}</h1>
    <form class="manifest-card" @submit.prevent="viewManifest">
      <div class="manifest-fields">
        <div class="field full">
          <label>{{ tr('Customer Name', 'اسم العميل') }} <span>*</span></label
          ><input
            v-model.trim="form.customer_name"
            required
            maxlength="255"
            :placeholder="tr('Enter customer name', 'أدخل اسم العميل')"
          />
        </div>
        <div class="field">
          <label>{{ tr('Pickup Date', 'تاريخ الاستلام') }} <span>*</span></label
          ><input v-model="form.pickup_date" type="date" required />
        </div>
        <div class="field">
          <label>{{ tr('Pickup Time', 'وقت الاستلام') }} <span>*</span></label
          ><input v-model="form.pickup_time" type="time" required />
        </div>
        <div class="field">
          <label>{{ tr('From', 'من') }} <span>*</span></label
          ><input
            v-model.trim="form.from"
            required
            :placeholder="tr('Enter location', 'أدخل الموقع')"
          />
        </div>
        <div class="field">
          <label>{{ tr('To', 'إلى') }} <span>*</span></label
          ><input
            v-model.trim="form.to"
            required
            :placeholder="tr('Enter location', 'أدخل الموقع')"
          />
        </div>
        <div class="field">
          <label>{{ tr('Flight Ticket', 'رقم الرحلة') }}</label
          ><input
            v-model.trim="form.flight_ticket"
            :placeholder="tr('Enter flight ticket number', 'أدخل رقم الرحلة')"
          />
        </div>
        <div class="field">
          <label>{{ tr('Driver', 'السائق') }}</label
          ><input
            v-model.trim="form.driver"
            :placeholder="tr('Enter driver name', 'أدخل اسم السائق')"
          />
        </div>
        <div class="field">
          <label>{{ tr('Vehicle', 'المركبة') }}</label
          ><input
            v-model.trim="form.vehicle"
            :placeholder="tr('Enter car name', 'أدخل اسم المركبة')"
          />
        </div>
        <div class="field">
          <label>{{ tr('Vehicle No.', 'رقم المركبة') }}</label
          ><input
            v-model.trim="form.vehicle_no"
            :placeholder="tr('Enter car number', 'أدخل رقم المركبة')"
          />
        </div>
        <div class="field full">
          <label>{{ tr('Font', 'حجم الخط') }}</label>
          <div class="font-control">
            <input
              v-model.number="form.font"
              type="number"
              min="8"
              max="40"
              step="1"
              placeholder="13"
            /><span>pt</span>
          </div>
        </div>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-if="Object.keys(validation).length" class="errors">
        <p v-for="(messages, key) in validation" :key="key">{{ key }}: {{ messages.join(', ') }}</p>
      </div>
      <button class="submit" type="submit" :disabled="busy">
        {{ busy ? tr('Generating...', 'جاري الإنشاء...') : tr('View Manifest', 'عرض البيان') }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.manifest-page {
  padding: 24px 16px 36px;
  color: #092143;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
}
h1 {
  font-size: 30px;
  font-weight: 750;
  margin: 0 0 45px;
}
.manifest-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 9px #00000012;
  padding: 32px clamp(20px, 9vw, 155px);
  max-width: 1600px;
  margin: auto;
  box-sizing: border-box;
}
.manifest-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 36px;
  row-gap: 26px;
}
.field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.field.full {
  grid-column: 1/-1;
}
label {
  font-weight: 650;
  font-size: 14px;
}
.field label span {
  color: #d82727;
}
input {
  height: 44px;
  border-radius: 12px;
  border: 1px solid #cdd7e3;
  box-sizing: border-box;
  padding: 0 17px;
  background: #fff;
  color: #092143;
  width: 100%;
  font: inherit;
  font-size: 13px;
}
input:focus {
  border-color: #70a4c4;
  outline: 2px solid #70a4c433;
}
.font-control {
  position: relative;
}
.font-control input {
  padding-inline-end: 48px;
}
.font-control span {
  position: absolute;
  inset-inline-end: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: #8291a5;
  pointer-events: none;
}
.submit {
  margin-top: 28px;
  width: 100%;
  border: 0;
  border-radius: 25px;
  background: #6ba3c6;
  color: #fff;
  height: 46px;
  font-weight: 650;
  cursor: pointer;
}
.submit:disabled {
  opacity: 0.6;
  cursor: wait;
}
.error,
.errors {
  color: #ad293a;
  font-size: 13px;
  margin: 14px 0 0;
}
@media (max-width: 720px) {
  .manifest-card {
    padding: 20px;
  }
  .manifest-fields {
    grid-template-columns: 1fr;
    row-gap: 16px;
  }
  .field.full {
    grid-column: auto;
  }
  h1 {
    margin-bottom: 22px;
  }
}
</style>
