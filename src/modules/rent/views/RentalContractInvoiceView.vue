<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const info = ref(null),
  error = ref(''),
  loading = ref(true)
const c = computed(() => info.value?.contract || {}),
  b = computed(() => c.value.booking || {}),
  currency = computed(() => info.value?.settings?.currency || b.value.currency || 'JOD')
function printInvoice() {
  window.print()
}
const amount = (v) => `${Number(v || 0).toFixed(2)} ${currency.value}`
onMounted(async () => {
  try {
    const { data } = await api.get(`/rent/rental-contracts/${route.params.id}`)
    info.value = data.data
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load invoice'
  } finally {
    loading.value = false
  }
})
</script>
<template>
  <section class="invoice" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="screen-actions">
      <button @click="router.push('/rent/contracts/rental')">{{ t('Back', 'العودة') }}</button
      ><button @click="printInvoice">{{ t('Print / Save PDF', 'طباعة / حفظ PDF') }}</button>
    </div>
    <div v-if="loading">{{ t('Loading...', 'جاري التحميل...') }}</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else class="paper">
      <header>
        <h1>{{ t('Rental Contract Invoice', 'فاتورة عقد تأجير سيارة') }}</h1>
        <div>{{ t('Contract', 'عقد') }} #{{ c.id }}</div>
      </header>
      <div class="info">
        <div>
          <b>{{ t('Customer / Company', 'العميل / الشركة') }}</b>
          <p>{{ b.customer?.name || b.customer_company?.name || '—' }}</p>
        </div>
        <div>
          <b>{{ t('Vehicle', 'السيارة') }}</b>
          <p>
            {{ b.car?.number || '—' }} · {{ b.car?.brand?.name }} {{ b.car?.model?.name }}
            {{ b.car?.model_year }}
          </p>
        </div>
        <div>
          <b>{{ t('Rental period', 'مدة الإيجار') }}</b>
          <p>{{ b.start_date }} — {{ b.end_date }} ({{ b.total_days }} {{ t('days', 'أيام') }})</p>
        </div>
      </div>
      <table>
        <tbody>
          <tr>
            <td>{{ t('Daily price', 'سعر اليوم') }}</td>
            <td>{{ amount(b.day_price) }}</td>
          </tr>
          <tr>
            <td>{{ t('Rental days', 'أيام الإيجار') }}</td>
            <td>{{ b.total_days }}</td>
          </tr>
          <tr>
            <td>{{ t('Extra items', 'الإضافات') }}</td>
            <td>{{ amount(b.extra_charge) }}</td>
          </tr>
          <tr>
            <td>{{ t('Extra kilometers', 'الكيلومترات الإضافية') }}</td>
            <td>{{ amount(b.extra_km_price) }}</td>
          </tr>
          <tr>
            <td>{{ t('Branch fee', 'رسوم الفرع') }}</td>
            <td>{{ amount(b.branch_fee) }}</td>
          </tr>
          <tr>
            <td>{{ t('Tax', 'الضريبة') }}</td>
            <td>{{ amount(b.tax) }}</td>
          </tr>
          <tr class="total">
            <td>{{ t('Total', 'الإجمالي') }}</td>
            <td>{{ amount(b.total) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="foot">
        {{ t('Payment method', 'طريقة الدفع') }}: {{ b.payment_method || 'cash' }} ·
        {{ t('Status', 'الحالة') }}: {{ c.status }}
      </p>
    </div>
  </section>
</template>
<style scoped>
.invoice {
  padding: 24px;
  color: #172c49;
}
.screen-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 20px;
}
.screen-actions button {
  background: #629fc3;
  color: #fff;
  border: 0;
  border-radius: 20px;
  padding: 10px 18px;
  cursor: pointer;
}
.paper {
  margin: auto;
  max-width: 850px;
  padding: 34px;
  border: 1px solid #d6e0e9;
  border-radius: 12px;
}
.paper header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #6e93b8;
  padding-bottom: 18px;
}
.paper h1 {
  font-size: 24px;
}
.info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin: 30px 0;
}
table {
  width: 100%;
  border-collapse: collapse;
}
td {
  padding: 13px;
  border-bottom: 1px solid #e1e6ed;
}
td:last-child {
  text-align: end;
}
.total {
  font-weight: 750;
  background: #e8f1f8;
}
.foot {
  color: #6c7e93;
  font-size: 12px;
  margin-top: 24px;
}
@media print {
  .screen-actions {
    display: none;
  }
  .invoice {
    padding: 0;
  }
  .paper {
    border: 0;
    max-width: none;
  }
  @page {
    size: A4;
    margin: 15mm;
  }
}
</style>
