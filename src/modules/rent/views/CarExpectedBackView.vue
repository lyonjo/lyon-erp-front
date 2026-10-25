<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const today = new Date()
const localDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const from = ref(localDate(today))
const weekLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6)
const to = ref(localDate(weekLater))
const busy = ref(false)
const error = ref('')
const canSubmit = computed(
  () => !!from.value && !!to.value && from.value <= to.value && !busy.value,
)

async function openReport() {
  if (!canSubmit.value) return
  error.value = ''
  // Open synchronously after the click to avoid popup blockers.
  const tab = window.open('', '_blank')
  if (!tab) {
    error.value = tr(
      'Please allow popups to open the PDF report.',
      'يرجى السماح بفتح النوافذ المنبثقة لعرض التقرير.',
    )
    return
  }
  tab.document.title = 'Car Expected Back'
  tab.document.body.textContent = 'Loading report...'
  busy.value = true
  try {
    const response = await api.get('/rent/cars-expected-back/report', {
      params: { from: from.value, to: to.value },
      responseType: 'blob',
    })
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(pdfBlob)
    tab.location.replace(blobUrl)
    // Allow browser PDF viewer to finish loading before cleaning up object URL.
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120000)
  } catch (e) {
    tab.close()
    error.value = tr(
      'Could not generate the report. Check the date range and try again.',
      'تعذر إنشاء التقرير. تحقق من التواريخ وحاول مرة أخرى.',
    )
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="expected-back">
    <h2>{{ tr('Car Expected Back', 'السيارات المتوقع عودتها') }}</h2>
    <div class="filter-card">
      <div class="form-content">
        <div class="date-fields">
          <div class="field">
            <label for="expected-from">{{ tr('From', 'من تاريخ') }}</label>
            <input id="expected-from" v-model="from" type="date" :max="to || undefined" />
          </div>
          <div class="field">
            <label for="expected-to">{{ tr('To', 'إلى تاريخ') }}</label>
            <input id="expected-to" v-model="to" type="date" :min="from || undefined" />
          </div>
        </div>
        <button class="report-btn" type="button" :disabled="!canSubmit" @click="openReport">
          {{
            busy
              ? tr('Generating PDF...', 'جاري إنشاء التقرير...')
              : tr('Filter / Open PDF Report', 'فلترة / عرض تقرير PDF')
          }}
        </button>
        <p v-if="!canSubmit && from && to && from > to" class="form-error">
          {{
            tr(
              'To date must not be earlier than From date.',
              'يجب أن يكون تاريخ النهاية بعد تاريخ البداية.',
            )
          }}
        </p>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.expected-back {
  padding: 16px 8px;
  color: #092043;
}
.expected-back h2 {
  font-size: 26px;
  margin: 0 0 37px;
  font-weight: 700;
}
.filter-card {
  min-height: 245px;
  padding: 25px 24px 42px;
  border: 1px solid #edf0f3;
  border-radius: 10px;
  background: white;
  box-shadow: 0 2px 5px #00000015;
}
.form-content {
  width: min(670px, 100%);
  margin: 0 auto;
}
.date-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
}
.field label {
  display: block;
  font-weight: 650;
  font-size: 14px;
  margin-bottom: 9px;
}
.field input {
  box-sizing: border-box;
  width: 100%;
  height: 42px;
  border: 1px solid #d0d9e5;
  border-radius: 11px;
  padding: 8px 15px;
  font: inherit;
  font-size: 13px;
  color: #142a4a;
  background: #fff;
}
.report-btn {
  display: block;
  width: 100%;
  margin-top: 45px;
  height: 31px;
  border: 0;
  border-radius: 22px;
  background: #5f9fc6;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}
.report-btn:hover:not(:disabled) {
  background: #4b8eb9;
}
.report-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.form-error {
  color: #b42336;
  font-size: 13px;
  margin: 14px 0 0;
}
@media (max-width: 650px) {
  .date-fields {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .expected-back h2 {
    font-size: 22px;
  }
}
</style>
