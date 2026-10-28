<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n()
const ar = computed(() => locale.value === 'ar'),
  t = (en, arabic) => (ar.value ? arabic : en)
const id = computed(() => route.params.id),
  isEdit = computed(() => !!id.value),
  readOnly = computed(() => !!id.value && !route.path.endsWith('/edit'))
const step = ref(0),
  loading = ref(false),
  saving = ref(false),
  err = ref(''),
  errors = ref({}),
  success = ref('')
const brands = ref([]),
  models = ref([]),
  companies = ref([]),
  branches = ref([]),
  features = ref([])
const state = ref(empty())
function empty() {
  return {
    number: '',
    brand_id: '',
    model_id: '',
    model_year: '',
    company_id: '',
    branch_id: '',
    vin_number: '',
    engine_number: '',
    engine_size: null,
    registration_number: '',
    fuel_type: '',
    passengers_number: '',
    gearbox_type: '',
    has_blutooth: false,
    has_camera: false,
    license_expiration: '',
    insurance_expiration: '',
    current_km: 0,
    odometer: 0,
    status: true,
    features: [],
  }
}
const modelOptions = computed(() =>
  models.value.filter((m) => String(m.brand_id) === String(state.value.brand_id)),
)
watch(
  () => state.value.brand_id,
  () => {
    if (
      state.value.model_id &&
      !modelOptions.value.some((m) => String(m.id) === String(state.value.model_id))
    )
      state.value.model_id = ''
  },
)
const branchName = computed(
  () => branches.value.find((x) => String(x.id) === String(state.value.branch_id))?.name || '—',
)
function apiError(e) {
  err.value = e.response?.data?.message || t('Request failed', 'فشل الطلب')
  errors.value = e.response?.data?.errors || {}
}
async function getAll() {
  loading.value = true
  err.value = ''
  try {
    const endpoints = [
      '/rent/vehicle-catalog/brands',
      '/rent/vehicle-catalog/models',
      '/rent/companies',
      '/rent/branches',
      '/rent/vehicle-catalog/features',
    ]
    const responses = await Promise.all(
      endpoints.map((url) =>
        api.get(url, {
          params:
            url.endsWith('/companies') || url.endsWith('/branches') ? { per_page: 100 } : undefined,
        }),
      ),
    )
    ;[brands.value, models.value, companies.value, branches.value, features.value] = responses.map(
      (r) => r.data.data ?? [],
    )
    if (id.value) {
      const { data } = await api.get(`/rent/vehicles/${id.value}`)
      const v = data.data
      state.value = {
        ...empty(),
        ...Object.fromEntries(Object.keys(empty()).map((k) => [k, v[k] ?? empty()[k]])),
        features: (v.features || []).map((x) => x.id),
        license_expiration: (v.license_expiration || '').slice(0, 10),
        insurance_expiration: (v.insurance_expiration || '').slice(0, 10),
      }
    }
  } catch (e) {
    apiError(e)
  } finally {
    loading.value = false
  }
}
onMounted(getAll)
async function save() {
  if (readOnly.value) return
  saving.value = true
  err.value = ''
  errors.value = {}
  try {
    const payload = { ...state.value }
    if (isEdit.value) await api.put(`/rent/vehicles/${id.value}`, payload)
    else await api.post('/rent/vehicles', payload)
    success.value = t('Vehicle saved successfully', 'تم حفظ المركبة بنجاح')
    router.push('/rent/cars')
  } catch (e) {
    apiError(e)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <div class="vehicle-form" :dir="ar ? 'rtl' : 'ltr'">
    <div class="heading">
      <h1>
        {{
          readOnly
            ? t('Vehicle Details', 'تفاصيل المركبة')
            : isEdit
              ? t('Edit Vehicle', 'تعديل مركبة')
              : t('Add Car', 'إضافة مركبة')
        }}
      </h1>
      <div class="head-actions">
        <button class="secondary" @click="router.push('/rent/cars')">{{ t('Back', 'رجوع') }}</button
        ><button v-if="!readOnly" class="blue" :disabled="saving || loading" @click="save">
          {{
            saving
              ? t('Saving...', 'جارٍ الحفظ...')
              : isEdit
                ? t('Save Changes', 'حفظ التعديلات')
                : t('Add', 'إضافة')
          }}
        </button>
      </div>
    </div>
    <section class="form-card">
      <div class="tabs">
        <button :class="{ active: step === 0 }" @click="step = 0">
          {{ t('Vehicles Information', 'معلومات المركبة') }}</button
        ><button :class="{ active: step === 1 }" @click="step = 1">
          {{ t('Vehicles Features', 'ميزات المركبة') }}
        </button>
      </div>
      <p v-if="loading" class="notice">{{ t('Loading...', 'جارٍ التحميل...') }}</p>
      <p v-if="err" class="notice bad">{{ err }}</p>
      <p v-if="success" class="notice">{{ success }}</p>
      <fieldset :disabled="loading || readOnly" class="fields-wrap">
        <div v-show="step === 0" class="fields">
          <label
            >{{ t('Vehicle No.', 'رقم المركبة') }} *<input
              v-model.trim="state.number"
              required
              :placeholder="t('Enter car number', 'أدخل رقم المركبة')"
          /></label>
          <label
            >{{ t('Vehicle Brand', 'ماركة المركبة') }} *<select v-model="state.brand_id" required>
              <option value="">{{ t('Select Brand', 'اختر الماركة') }}</option>
              <option v-for="x in brands" :value="x.id" :key="x.id">{{ x.name }}</option>
            </select></label
          >
          <label
            >{{ t('Vehicle Name', 'اسم المركبة') }} *<select v-model="state.model_id" required>
              <option value="">{{ t('Select Car Name', 'اختر الموديل') }}</option>
              <option v-for="x in modelOptions" :value="x.id" :key="x.id">{{ x.name }}</option>
            </select></label
          >
          <label
            >{{ t('Model Year', 'سنة الصنع') }} *<input
              v-model.number="state.model_year"
              type="number"
              min="1950"
              max="2100"
          /></label>
          <label
            >{{ t('Engine Number', 'رقم المحرك') }}<input v-model="state.engine_number"
          /></label>
          <label>{{ t('VIN Number', 'رقم الهيكل') }}<input v-model="state.vin_number" /></label>
          <label
            >{{ t('Company Name', 'اسم الشركة') }} *<select v-model="state.company_id">
              <option value="">{{ t('Select company', 'اختر الشركة') }}</option>
              <option v-for="x in companies" :key="x.id" :value="x.id">{{ x.name }}</option>
            </select></label
          >
          <label
            >{{ t('Registration Number', 'رقم التسجيل')
            }}<input v-model="state.registration_number"
          /></label>
          <label
            >{{ t('Branch / Current Location', 'الفرع / الموقع الحالي') }} *<select
              v-model="state.branch_id"
            >
              <option value="">{{ t('Select branch', 'اختر الفرع') }}</option>
              <option v-for="x in branches" :key="x.id" :value="x.id">{{ x.name }}</option>
            </select></label
          >
          <label
            >{{ t('License Expiry Date', 'تاريخ انتهاء الترخيص')
            }}<input v-model="state.license_expiration" type="date"
          /></label>
          <label
            >{{ t('Insurance Expiry Date', 'تاريخ انتهاء التأمين')
            }}<input v-model="state.insurance_expiration" type="date"
          /></label>
          <label
            >{{ t('Status', 'الحالة')
            }}<select v-model="state.status">
              <option :value="true">{{ t('Active', 'نشطة') }}</option>
              <option :value="false">{{ t('Inactive', 'غير نشطة') }}</option>
            </select></label
          >
        </div>
        <div v-show="step === 1" class="fields">
          <label
            >{{ t('Engine Size', 'حجم المحرك')
            }}<input
              v-model.number="state.engine_size"
              type="number"
              min="0"
              step="any"
              :placeholder="t('Enter engine size', 'أدخل حجم المحرك')"
            /><small v-if="errors.engine_size" class="field-error">{{
              errors.engine_size[0]
            }}</small></label
          >
          <label
            >{{ t('Passengers Number', 'عدد الركاب') }} *<input
              v-model.number="state.passengers_number"
              type="number"
              min="1"
              max="100"
          /></label>
          <label
            >{{ t('Fuel Type', 'نوع الوقود') }} *<select v-model="state.fuel_type">
              <option value="">{{ t('Select Fuel Type', 'اختر الوقود') }}</option>
              <option v-for="v in ['gasoline', 'diesel', 'electric', 'hyprid']" :key="v" :value="v">
                {{
                  v === 'hyprid'
                    ? t('Hybrid', 'هجين')
                    : v === 'gasoline'
                      ? t('Gasoline', 'بنزين')
                      : v === 'diesel'
                        ? t('Diesel', 'ديزل')
                        : t('Electric', 'كهربائي')
                }}
              </option>
            </select></label
          >
          <label
            >{{ t('Gearbox Type', 'نوع ناقل الحركة') }} *<select v-model="state.gearbox_type">
              <option value="">{{ t('Select Gearbox', 'اختر الناقل') }}</option>
              <option value="manual">{{ t('Manual', 'يدوي') }}</option>
              <option value="automatic">{{ t('Automatic', 'أوتوماتيكي') }}</option>
            </select></label
          >
          <label class="full-row"
            >{{ t('Current KM', 'الكيلومترات الحالية') }} *<input
              v-model.number="state.current_km"
              type="number"
              min="0"
          /></label>
          <div class="feature-group">
            <strong>{{ t('Extra Features', 'الميزات الإضافية') }}</strong>
            <div class="feature-list">
              <label v-for="f in features" :key="f.id" class="feature toggle"
                ><input type="checkbox" :value="f.id" v-model="state.features" />{{ f.name }}</label
              >
            </div>
          </div>
        </div>
      </fieldset>
      <p v-for="(msgs, key) in errors" :key="key" class="field-error">{{ key }}: {{ msgs[0] }}</p>
    </section>
  </div>
</template>
<style scoped>
.vehicle-form {
  padding: 15px 20px 50px;
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #122039;
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 45px;
  gap: 15px;
}
.heading h1 {
  font-size: 27px;
  margin: 0;
}
.head-actions {
  display: flex;
  gap: 10px;
}
.blue {
  background: #70a1c0;
  border: 0;
  border-radius: 28px;
  color: white;
  font-weight: 650;
  font-size: 14px;
  padding: 12px 25px;
  box-shadow: 0 3px 7px #0002;
  cursor: pointer;
}
.blue:hover {
  background: #568eb1;
}
.blue:disabled {
  opacity: 0.55;
}
.secondary {
  border: 1px solid #cdd8e5;
  border-radius: 25px;
  background: white;
  padding: 11px 23px;
  cursor: pointer;
}
.form-card {
  border: 1px solid #d6e0ea;
  border-radius: 17px;
  box-shadow: 0 2px 5px #0001;
  padding: 25px 30px 30px;
  min-height: 360px;
}
.tabs {
  display: flex;
  justify-content: center;
  gap: 55px;
  margin-bottom: 50px;
  flex-wrap: wrap;
}
.tabs button {
  background: none;
  border: 0;
  font-size: 17px;
  font-weight: 650;
  color: #a2acc0;
  cursor: pointer;
}
.tabs button.active {
  color: #0d1b31;
}
.fields-wrap {
  border: 0;
  max-width: 745px;
  margin: auto;
  padding: 0;
}
.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.fields label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  font-weight: 650;
  gap: 6px;
}
.fields input:not([type='checkbox']),
.fields select {
  border: 1px solid #d7dfe9;
  background: #fff;
  border-radius: 13px;
  padding: 10px 14px;
  height: 43px;
  box-sizing: border-box;
  width: 100%;
  color: #23334c;
  font: inherit;
  font-weight: 400;
}
.fields input:focus,
.fields select:focus {
  outline: 2px solid #d0e7f6;
}
.fields .toggle {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.toggle input {
  appearance: none;
  background: #e5e7eb;
  width: 46px;
  height: 25px;
  border-radius: 20px;
  position: relative;
  cursor: pointer;
}
.toggle input:before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 19px;
  height: 19px;
  background: white;
  border-radius: 50%;
  transition: transform 0.15s;
}
.toggle input:checked {
  background: #70a1c0;
}
.toggle input:checked:before {
  transform: translateX(21px);
}
.feature-group {
  grid-column: 1/-1;
}
.fields .full-row {
  grid-column: 1 / -1;
}
.feature-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 14px;
}
.feature {
  display: flex !important;
  flex-direction: row-reverse !important;
  justify-content: flex-end;
  align-items: center;
  gap: 12px !important;
}
.bottom-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 35px;
}
.notice {
  text-align: center;
  color: #7a8aa0;
}
.bad,
.field-error {
  color: #c73636;
}
.field-error {
  font-size: 12px;
  text-align: center;
}
@media (max-width: 700px) {
  .fields {
    grid-template-columns: 1fr;
  }
  .form-card {
    padding: 20px 13px;
  }
  .heading {
    margin-bottom: 25px;
  }
  .tabs {
    gap: 18px;
    margin-bottom: 25px;
  }
  .tabs button {
    font-size: 14px;
  }
  .feature-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
