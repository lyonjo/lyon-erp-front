<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n(),
  tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const id = computed(() => route.params.id),
  isEdit = computed(() => !!id.value),
  readOnly = computed(() => !!id.value && !route.path.endsWith('/edit'))
const loading = ref(true),
  saving = ref(false),
  error = ref(''),
  fieldErrors = ref({}),
  tab = ref('pricing'),
  options = ref([]),
  search = ref(''),
  open = ref(false),
  selected = ref(null),
  mainFile = ref(null),
  galleryFiles = ref([]),
  oldImages = ref([]),
  deletedIds = ref([]),
  mainImage = ref(null)
const newInterval = () => ({ start: 1, end: 2, price: '' })
const newPeriod = () => ({ start_date: '', end_date: '', intervals: [newInterval()] })
const periods = ref([newPeriod()])
const clientType = ref('customer'),
  companyId = ref('')
const filteredOptions = computed(() =>
  options.value.filter((o) =>
    `${o.brand_name} ${o.model_name} ${o.model_year}`
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
)
const imageBlobs = ref({})
const imageUrl = (image) => imageBlobs.value[image.id] || ''
async function loadImage(image) {
  if (!image) return
  try {
    const { data } = await api.get(`/rent/car-rental-prices/${id.value}/images/${image.id}`, {
      responseType: 'blob',
    })
    imageBlobs.value[image.id] = URL.createObjectURL(data)
  } catch (e) {}
}
onBeforeUnmount(() => Object.values(imageBlobs.value).forEach(URL.revokeObjectURL))
function label(o) {
  return `${o.brand_name} ${o.model_name} ${o.model_year}`
}
function pick(o) {
  if (isEdit.value) return
  selected.value = o
  search.value = label(o)
  open.value = false
}
function addPeriod() {
  periods.value.push(newPeriod())
}
function dropPeriod(i) {
  if (periods.value.length > 1) periods.value.splice(i, 1)
}
function addInterval(p) {
  p.intervals.push(newInterval())
}
function dropInterval(p, i) {
  if (p.intervals.length > 1) p.intervals.splice(i, 1)
}
function removeImage(image) {
  deletedIds.value.push(image.id)
  oldImages.value = oldImages.value.filter((x) => x.id !== image.id)
  if (mainImage.value?.id === image.id) mainImage.value = null
}
function onMain(e) {
  mainFile.value = e.target.files?.[0] || null
}
function onGallery(e) {
  galleryFiles.value = [...galleryFiles.value, ...Array.from(e.target.files || [])]
  e.target.value = ''
}
async function init() {
  loading.value = true
  error.value = ''
  try {
    const tasks = [
      api.get('/rent/car-rental-prices/options', {
        params: { client_type: 'customer', ...(id.value ? { include_id: id.value } : {}) },
      }),
    ]
    if (id.value) tasks.push(api.get(`/rent/car-rental-prices/${id.value}`))
    const res = await Promise.all(tasks)
    options.value = res[0].data.data || []
    if (id.value) {
      const d = res[1].data.data
      selected.value = {
        brand_id: d.brand_id,
        model_id: d.model_id,
        model_year: d.model_year,
        brand_name: d.brand?.name || '',
        model_name: d.model?.name || '',
      }
      search.value = label(selected.value)
      periods.value = (d.periods || []).map((p) => ({
        start_date: String(p.start_date || '').slice(0, 10),
        end_date: String(p.end_date || '').slice(0, 10),
        intervals: (p.intervals || []).map((i) => ({ start: i.start, end: i.end, price: i.price })),
      }))
      if (!periods.value.length) periods.value = [newPeriod()]
      clientType.value = d.client_type || 'customer'
      companyId.value = d.company_id || ''
      oldImages.value = d.gallery_images || []
      mainImage.value = d.main_image || null
      await Promise.all([mainImage.value, ...oldImages.value].filter(Boolean).map(loadImage))
    }
  } catch (e) {
    error.value =
      e.response?.data?.message ||
      tr('Unable to load car pricing data.', 'تعذر تحميل بيانات التسعير.')
  } finally {
    loading.value = false
  }
}
onMounted(init)
watch(() => route.fullPath, init)
watch(search, () => {
  if (selected.value && search.value !== label(selected.value)) selected.value = null
})
async function save() {
  if (readOnly.value || saving.value) return
  fieldErrors.value = {}
  error.value = ''
  if (!selected.value) {
    error.value = tr('Select a car first.', 'اختر السيارة أولاً.')
    return
  }
  const body = new FormData()
  body.append('brand_id', selected.value.brand_id)
  body.append('model_id', selected.value.model_id)
  body.append('model_year', selected.value.model_year)
  body.append('client_type', 'customer')
  // Customer page intentionally stores customer pricing only; company is nullable.
  periods.value.forEach((p, i) => {
    body.append(`periods[${i}][start_date]`, p.start_date)
    body.append(`periods[${i}][end_date]`, p.end_date)
    p.intervals.forEach((x, j) => {
      body.append(`periods[${i}][intervals][${j}][start]`, x.start)
      body.append(`periods[${i}][intervals][${j}][end]`, x.end)
      body.append(`periods[${i}][intervals][${j}][price]`, x.price)
    })
  })
  if (mainFile.value) body.append('main_image', mainFile.value)
  galleryFiles.value.forEach((f) => body.append('gallery[]', f))
  deletedIds.value.forEach((x) => body.append('delete_image_ids[]', x))
  if (isEdit.value) body.append('_method', 'PUT')
  saving.value = true
  try {
    await api.post(
      isEdit.value ? `/rent/car-rental-prices/${id.value}` : '/rent/car-rental-prices',
      body,
    )
    router.push('/rent/car-rental-price')
  } catch (e) {
    fieldErrors.value = e.response?.data?.errors || {}
    error.value = e.response?.data?.message || tr('Save failed.', 'تعذر الحفظ.')
    if (Object.keys(fieldErrors.value).length) tab.value = 'pricing'
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <section class="cr-form">
    <div class="header">
      <h2>
        {{
          readOnly
            ? tr('View Car', 'عرض السيارة')
            : isEdit
              ? tr('Edit Car', 'تعديل سيارة')
              : tr('Add Car', 'إضافة سيارة')
        }}
      </h2>
      <div class="head-actions">
        <button class="secondary" @click="router.push('/rent/car-rental-price')">
          {{ tr('Back', 'رجوع') }}</button
        ><button
          v-if="!readOnly"
          class="primary"
          :disabled="loading || saving || !selected"
          @click="save"
        >
          {{ saving ? tr('Saving...', 'جاري الحفظ...') : tr('Save', 'حفظ') }}
        </button>
      </div>
    </div>
    <div v-if="loading" class="loading">
      ⏳ {{ tr('Loading car and pricing data...', 'جاري تحميل بيانات السيارة والأسعار...') }}
    </div>
    <div v-else-if="error && !selected && !options.length" class="error-box">
      {{ error }} <button @click="init">{{ tr('Retry', 'إعادة المحاولة') }}</button>
    </div>
    <template v-else>
      <label class="selector-label">{{ tr('Select Car', 'اختر السيارة') }}</label>
      <div class="vehicle-picker">
        <input
          v-model="search"
          :disabled="readOnly || isEdit"
          :placeholder="tr('Search brand, model, year...', 'بحث بالماركة أو الموديل أو السنة...')"
          @focus="open = true"
          @input="open = true"
        /><button type="button" :disabled="readOnly || isEdit" @click="open = !open">⌄</button>
        <div v-if="open && !readOnly && !isEdit" class="options">
          <button
            v-for="(o, i) in filteredOptions"
            :key="`${o.brand_id}-${o.model_id}-${o.model_year}-${i}`"
            @click="pick(o)"
          >
            {{ label(o) }}
          </button>
          <div v-if="!filteredOptions.length" class="empty">
            {{ tr('No cars available', 'لا توجد سيارات متاحة') }}
          </div>
        </div>
      </div>
      <p v-if="error" class="error-box">{{ error }}</p>
      <div v-for="(messages, key) in fieldErrors" :key="key" class="validation">
        {{ key }}: {{ messages.join(', ') }}
      </div>
      <div v-if="selected" class="workspace">
        <nav class="tabs">
          <button :class="{ active: tab === 'pricing' }" @click="tab = 'pricing'">
            {{ tr('Rental Pricing', 'أسعار التأجير') }}</button
          ><button :class="{ active: tab === 'images' }" @click="tab = 'images'">
            {{ tr('Upload Car Images', 'رفع صور السيارة') }}
          </button>
        </nav>
        <div v-if="tab === 'pricing'" class="plan-list">
          <article v-for="(p, i) in periods" :key="i" class="plan">
            <div class="plan-title">
              <strong>{{ tr('Pricing Plan', 'خطة التسعير') }} {{ i + 1 }}</strong
              ><button
                v-if="!readOnly && periods.length > 1"
                class="danger-text"
                @click="dropPeriod(i)"
              >
                ✕ {{ tr('Remove Plan', 'حذف الخطة') }}
              </button>
            </div>
            <div class="date-row">
              <div class="field">
                <label>{{ tr('Start Date', 'تاريخ البداية') }}</label
                ><input v-model="p.start_date" type="date" :disabled="readOnly" />
              </div>
              <div class="field">
                <label>{{ tr('End Date', 'تاريخ النهاية') }}</label
                ><input v-model="p.end_date" type="date" :disabled="readOnly" />
              </div>
            </div>
            <div v-for="(x, j) in p.intervals" :key="j" class="interval">
              <strong
                >{{ tr('Internal', 'الفترة') }} ({{ j + 1 }}) {{ tr('Price', 'السعر') }}</strong
              >
              <div class="interval-row">
                <div class="field">
                  <label>{{ tr('From (days)', 'من (أيام)') }}</label
                  ><input
                    v-model.number="x.start"
                    type="number"
                    min="1"
                    :disabled="readOnly"
                    placeholder="1"
                  />
                </div>
                <div class="field">
                  <label>{{ tr('To (days)', 'إلى (أيام)') }}</label
                  ><input
                    v-model.number="x.end"
                    type="number"
                    min="2"
                    :disabled="readOnly"
                    placeholder="2"
                  />
                </div>
                <div class="field">
                  <label>{{ tr('Price', 'السعر') }}</label
                  ><input
                    v-model="x.price"
                    type="number"
                    min="0"
                    step="0.01"
                    :disabled="readOnly"
                    placeholder="Enter price"
                  />
                </div>
                <button
                  v-if="!readOnly && p.intervals.length > 1"
                  class="delete-icon"
                  :title="tr('Remove interval', 'حذف الفترة')"
                  @click="dropInterval(p, j)"
                >
                  ▤
                </button>
              </div>
            </div>
            <div v-if="!readOnly" class="plan-foot">
              <button @click="addInterval(p)">+ {{ tr('New Internal', 'فترة جديدة') }}</button>
            </div>
          </article>
          <button v-if="!readOnly" class="primary add-plan" @click="addPeriod">
            + {{ tr('New Pricing Plan', 'خطة تسعير جديدة') }}
          </button>
        </div>
        <div v-else class="images-panel">
          <div class="field">
            <label>{{ tr('Main Image', 'الصورة الرئيسية') }}</label>
            <div
              v-if="mainImage && !deletedIds.includes(mainImage.id) && imageUrl(mainImage)"
              class="picture"
            >
              <img :src="imageUrl(mainImage)" alt="Main image" /><button
                v-if="!readOnly"
                @click="removeImage(mainImage)"
              >
                ✕
              </button>
            </div>
            <label v-if="!readOnly" class="upload"
              >↑<strong>{{ tr('Click to upload', 'اضغط للرفع') }}</strong
              ><small>JPG, PNG, WEBP · 5MB max</small
              ><input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                @change="onMain" /></label
            ><span v-if="mainFile">{{ mainFile.name }}</span>
          </div>
          <div class="field">
            <label>{{ tr('Gallery Images', 'صور المعرض') }}</label>
            <div class="gallery">
              <div v-for="image in oldImages" :key="image.id" class="picture">
                <img :src="imageUrl(image)" alt="Gallery image" /><button
                  v-if="!readOnly"
                  @click="removeImage(image)"
                >
                  ✕
                </button>
              </div>
            </div>
            <label v-if="!readOnly" class="upload"
              >↑<strong>{{ tr('Click to upload', 'اضغط للرفع') }}</strong
              ><small>JPG, PNG, WEBP · 5MB each</small
              ><input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                @change="onGallery"
            /></label>
            <div v-for="f in galleryFiles" :key="f.name">
              {{ f.name }}
              <button v-if="!readOnly" @click="galleryFiles = galleryFiles.filter((x) => x !== f)">
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
<style scoped>
.cr-form {
  padding: 16px 20px;
  color: #092043;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 10px;
}
.header h2 {
  font-size: 26px;
  margin: 0;
}
.head-actions {
  display: flex;
  gap: 10px;
}
.primary {
  border: 0;
  background: #70a4c4;
  color: white;
  border-radius: 25px;
  padding: 10px 28px;
  min-width: 118px;
  font-weight: 600;
  cursor: pointer;
}
.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.secondary {
  border: 1px solid #dae0e6;
  border-radius: 22px;
  background: white;
  padding: 9px 20px;
  cursor: pointer;
}
.selector-label,
.field label {
  display: block;
  font-size: 13px;
  font-weight: 650;
  margin-bottom: 9px;
}
.vehicle-picker {
  position: relative;
  width: min(360px, 100%);
  display: flex;
  border: 1px solid #d2dae4;
  border-radius: 13px;
  height: 32px;
  margin-bottom: 22px;
}
.vehicle-picker input:disabled {
  background: #f3f4f6;
  color: #64748b;
  cursor: not-allowed;
}
.vehicle-picker > button:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}
.vehicle-picker:has(input:disabled) {
  background: #f3f4f6;
}
.vehicle-picker input {
  border: 0;
  background: transparent;
  padding: 0 12px;
  font-size: 12px;
  flex: 1;
  min-width: 0;
  outline: none;
}
.vehicle-picker > button {
  border: 0;
  background: none;
  padding: 0 15px;
  cursor: pointer;
  color: #475b73;
}
.options {
  position: absolute;
  top: calc(100% + 3px);
  left: 0;
  right: 0;
  max-height: 255px;
  overflow: auto;
  background: white;
  z-index: 15;
  box-shadow: 0 10px 22px #0002;
  border: 1px solid #d6dde5;
  border-radius: 9px;
}
.options button {
  display: block;
  width: 100%;
  padding: 9px 15px;
  text-align: start;
  background: white;
  border: 0;
  cursor: pointer;
  color: #092043;
}
.options button:hover {
  background: #eef6fb;
}
.empty {
  padding: 12px;
  color: #7a8290;
}
.workspace {
  border: 1px solid #d9e0e7;
  border-radius: 14px;
  min-height: 450px;
  padding: 25px 20px 45px;
  background: white;
  box-shadow: 0 2px 5px #0001;
}
.tabs {
  display: flex;
  justify-content: center;
  gap: 35px;
  margin-bottom: 26px;
}
.tabs button {
  background: none;
  border: 0;
  cursor: pointer;
  color: #a1a7b9;
  font-size: 15px;
  font-weight: 600;
}
.tabs button.active {
  color: #071c3d;
}
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
}
.plan {
  width: min(850px, 100%);
  border: 1px solid #dce1e8;
  border-radius: 13px;
  padding: 24px;
  box-shadow: 0 3px 6px #0001;
}
.plan-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}
.plan-title strong,
.interval strong {
  font-size: 14px;
}
.date-row,
.interval-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 20px;
}
.field input {
  box-sizing: border-box;
  width: 100%;
  height: 42px;
  border: 1px solid #dce1e8;
  border-radius: 13px;
  padding: 7px 13px;
  background: white;
  color: #092043;
}
.interval {
  margin-top: 20px;
}
.interval strong {
  display: block;
  margin-bottom: 18px;
}
.interval-row {
  grid-template-columns: 1.2fr 1.2fr 0.85fr 28px;
  align-items: end;
  gap: 14px;
}
.interval-row .field {
  min-width: 0;
}
.delete-icon,
.danger-text {
  border: 0;
  background: none;
  color: #c23b4b;
  cursor: pointer;
}
.delete-icon {
  height: 42px;
}
.plan-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 26px;
}
.plan-foot button {
  background: none;
  border: 0;
  cursor: pointer;
  color: #092043;
  font-weight: 650;
}
.add-plan {
  align-self: center;
  margin-top: 10px;
}
.images-panel {
  width: min(850px, 100%);
  margin: 0 auto;
}
.images-panel > .field {
  margin-bottom: 30px;
}
.upload {
  display: flex;
  flex-direction: column;
  gap: 9px;
  align-items: center;
  justify-content: center;
  border: 1px dashed #71859c;
  min-height: 145px;
  cursor: pointer;
  text-align: center;
  color: #215da2;
}
.upload strong {
  color: #092043;
}
.upload small {
  color: #96a0b7;
  font-size: 11px;
}
.picture {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}
.picture img {
  width: 110px;
  height: 82px;
  object-fit: cover;
  border-radius: 7px;
}
.picture button {
  position: absolute;
  top: 0;
  right: 0;
  border: 0;
  background: #fff;
  color: #c12;
  cursor: pointer;
}
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.loading {
  text-align: center;
  padding: 80px;
}
.error-box {
  color: #b42336;
  padding: 14px;
  background: #fff4f5;
  border-radius: 9px;
  margin: 10px 0;
}
.validation {
  font-size: 12px;
  color: #b42336;
  margin: 4px 0;
}
@media (max-width: 620px) {
  .date-row,
  .interval-row {
    grid-template-columns: 1fr;
  }
  .interval-row .delete-icon {
    justify-self: start;
  }
  .workspace {
    padding: 15px;
  }
  .header h2 {
    font-size: 20px;
  }
}
</style>
