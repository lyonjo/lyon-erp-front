<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const tr = (en, arabic) => (ar.value ? arabic : en)

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const errors = ref({})
const form = ref(defaults())

function defaults() {
  return {
    booking_tax_percent: '0',
    car_rental_km_daily: '0',
    car_rental_price_per_km: '0',
    currency: 'JOD',
  }
}

function hydrate(data) {
  const source = data || {}
  form.value = Object.fromEntries(
    Object.entries(defaults()).map(([key, fallback]) => [key, String(source[key] ?? fallback)]),
  )
}

async function load() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const response = await api.get('/rent/settings')
    hydrate(response.data?.data)
  } catch (e) {
    error.value = e.response?.data?.message || tr('Unable to load settings.', 'تعذر تحميل الإعدادات.')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (loading.value || saving.value) return
  error.value = ''
  success.value = ''
  errors.value = {}
  saving.value = true
  try {
    const { data } = await api.put('/rent/settings', {
      booking_tax_percent: form.value.booking_tax_percent,
      car_rental_km_daily: form.value.car_rental_km_daily,
      car_rental_price_per_km: form.value.car_rental_price_per_km,
      currency: form.value.currency,
    })
    hydrate(data.data)
    success.value = tr('Settings saved successfully.', 'تم حفظ الإعدادات بنجاح.')
  } catch (e) {
    errors.value = e.response?.data?.errors || {}
    error.value = e.response?.data?.message || tr('Unable to save settings.', 'تعذر حفظ الإعدادات.')
  } finally {
    saving.value = false
  }
}

const currencyOptions = [
  { code: 'JOD', en: 'Jordanian Dinar', ar: 'دينار أردني' },
  { code: 'USD', en: 'US Dollar', ar: 'دولار أمريكي' },
  { code: 'EUR', en: 'Euro', ar: 'يورو' },
  { code: 'SAR', en: 'Saudi Riyal', ar: 'ريال سعودي' },
  { code: 'AED', en: 'UAE Dirham', ar: 'درهم إماراتي' },
]

onMounted(load)
</script>

<template>
  <section class="rent-settings" :dir="ar ? 'rtl' : 'ltr'">
    <div class="page-head">
      <div>
        <h2>{{ tr('Settings', 'الإعدادات') }}</h2>
        <p>{{ tr('Manage booking and rental defaults for this tenant.', 'إدارة الإعدادات الافتراضية للحجوزات والتأجير لهذا المستأجر.') }}</p>
      </div>
      <button class="save-btn" type="button" :disabled="loading || saving" @click="save">
        {{ saving ? tr('Saving...', 'جاري الحفظ...') : tr('Save Changes', 'حفظ التغييرات') }}
      </button>
    </div>

    <div v-if="loading" class="status loading" role="status">
      <span class="spinner" aria-hidden="true"></span>
      {{ tr('Loading settings...', 'جاري تحميل الإعدادات...') }}
    </div>

    <template v-else>
      <div v-if="error" class="status error" role="alert">
        {{ error }}
        <button v-if="!Object.keys(errors).length" type="button" @click="load">{{ tr('Retry', 'إعادة المحاولة') }}</button>
      </div>
      <div v-if="success" class="status success" role="status">{{ success }}</div>

      <form class="settings-card" @submit.prevent="save">
        <div class="group-head">
          <h3>{{ tr('Booking Settings', 'إعدادات الحجوزات') }}</h3>
          <p>{{ tr('Tax is a percentage, not a fixed amount.', 'الضريبة نسبة مئوية وليست مبلغاً ثابتاً.') }}</p>
        </div>
        <div class="fields">
          <div class="field">
            <label for="tax-percent">{{ tr('Booking Tax (%)', 'ضريبة الحجز (%)') }}</label>
            <div class="input-wrap">
              <input id="tax-percent" v-model="form.booking_tax_percent" type="number" step="0.01" min="0" max="100" required />
              <span class="suffix">%</span>
            </div>
            <small>{{ tr('Example: 16 means 16% tax on each booking.', 'مثال: 16 تعني ضريبة 16% على كل حجز.') }}</small>
            <p v-if="errors.booking_tax_percent" class="field-error">{{ errors.booking_tax_percent.join(', ') }}</p>
          </div>
        </div>

        <div class="separator"></div>
        <div class="group-head">
          <h3>{{ tr('Car Rental Settings', 'إعدادات تأجير السيارات') }}</h3>
          <p>{{ tr('Default daily allowance and excess kilometer rate.', 'الحد اليومي الافتراضي للكيلومترات وسعر الكيلومتر الإضافي.') }}</p>
        </div>
        <div class="fields">
          <div class="field">
            <label for="daily-km">{{ tr('Car Rental (km) / Daily', 'تأجير السيارات (كم) / يومياً') }}</label>
            <div class="input-wrap">
              <input id="daily-km" v-model="form.car_rental_km_daily" type="number" step="1" min="0" required />
              <span class="suffix">km</span>
            </div>
            <p v-if="errors.car_rental_km_daily" class="field-error">{{ errors.car_rental_km_daily.join(', ') }}</p>
          </div>
          <div class="field">
            <label for="km-price">{{ tr('Car Rental (price/km)', 'تأجير السيارات (السعر / كم)') }}</label>
            <div class="input-wrap">
              <input id="km-price" v-model="form.car_rental_price_per_km" type="number" step="0.0001" min="0" required />
              <span class="suffix">{{ form.currency }}</span>
            </div>
            <p v-if="errors.car_rental_price_per_km" class="field-error">{{ errors.car_rental_price_per_km.join(', ') }}</p>
          </div>
        </div>

        <div class="separator"></div>
        <div class="group-head">
          <h3>{{ tr('Tenant Currency', 'عملة المستأجر') }}</h3>
          <p>{{ tr('New tenants default to JOD.', 'العملة الافتراضية للمستأجرين الجدد هي الدينار الأردني.') }}</p>
        </div>
        <div class="fields">
          <div class="field">
            <label for="currency">{{ tr('Currency', 'العملة') }}</label>
            <select id="currency" v-model="form.currency" required>
              <option v-for="currency in currencyOptions" :key="currency.code" :value="currency.code">
                {{ currency.code }} — {{ ar ? currency.ar : currency.en }}
              </option>
            </select>
            <p v-if="errors.currency" class="field-error">{{ errors.currency.join(', ') }}</p>
          </div>
        </div>
        <div class="foot-actions">
          <button class="save-btn" type="submit" :disabled="saving">
            {{ saving ? tr('Saving...', 'جاري الحفظ...') : tr('Save Changes', 'حفظ التغييرات') }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.rent-settings{padding:16px 20px;color:#0b2141;max-width:1280px;margin:0 auto}
.page-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}
.page-head h2{font-size:24px;margin:0 0 8px;font-weight:700}
.page-head p,.group-head p{font-size:13px;color:#74849a;margin:0}
.save-btn{border:0;border-radius:28px;background:#70a4c4;color:#fff;padding:10px 23px;min-width:124px;font-weight:650;cursor:pointer}
.save-btn:disabled{opacity:.6;cursor:not-allowed}
.settings-card{background:#fff;border:1px solid #dae1e9;border-radius:15px;padding:28px 32px;box-shadow:0 2px 6px #0000000b}
.group-head h3{font-size:17px;margin:0 0 8px}
.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:25px;max-width:980px;margin-top:22px}
.field{min-width:0}
.field label{display:block;font-size:13px;font-weight:700;margin-bottom:9px}
.field input,.field select{box-sizing:border-box;width:100%;height:40px;padding:8px 14px;border:1px solid #ccd6e2;border-radius:12px;outline:0;background:white;color:#0b2141;font-size:13px}
.field input:focus,.field select:focus{border-color:#70a4c4;box-shadow:0 0 0 2px #70a4c422}
.field small{display:block;margin-top:8px;color:#74849a;font-size:12px}
.input-wrap{position:relative}
.input-wrap input{padding-inline-end:68px}
.suffix{position:absolute;inset-inline-end:15px;top:50%;transform:translateY(-50%);font-size:12px;color:#718096;pointer-events:none}
.separator{border-top:1px solid #e7edf3;margin:32px 0 28px}
.foot-actions{display:flex;justify-content:flex-end;margin-top:32px}
.status{border-radius:10px;padding:14px 18px;margin-bottom:16px;font-size:13px}
.status.loading{display:flex;align-items:center;gap:12px;color:#56738f;background:#eef6fb}
.status.error{color:#a72537;background:#fff1f2}
.status.success{color:#176a42;background:#eff9f3}
.status button{margin-inline-start:12px;cursor:pointer;background:transparent;border:0;text-decoration:underline;color:inherit}
.field-error{font-size:12px;color:#b42336;margin:7px 0}
.spinner{width:18px;height:18px;border-radius:50%;border:2px solid #d2e3ed;border-top-color:#6098bc;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:700px){.rent-settings{padding:12px}.page-head{align-items:flex-start}.page-head h2{font-size:20px}.settings-card{padding:20px 16px}.fields{grid-template-columns:1fr}}
</style>
