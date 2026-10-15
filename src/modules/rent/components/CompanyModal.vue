<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n({ useScope: 'global' })
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ProtectedImage from '@/components/ProtectedImage.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  company: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
  error: { type: String, default: '' },
})
const emit = defineEmits(['close', 'submit'])

const isEdit = computed(() => Boolean(props.company))
const name = ref('')
const location = ref('')
const taxNumber = ref('')
const isMain = ref(false)
const logo = ref(null)
const preview = ref('')
const localError = ref('')
const fileInput = ref(null)
const nameInput = ref(null)

const existingLogoEndpoint = computed(() =>
  props.open && props.company?.id && props.company?.logo_url
    ? `/rent/companies/${props.company.id}/logo`
    : '',
)
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']

function revokePreview() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
}

function reset() {
  revokePreview()
  name.value = props.company?.name ?? ''
  location.value = props.company?.location ?? ''
  taxNumber.value = props.company?.tax_number ?? ''
  isMain.value = Boolean(props.company?.is_main)
  logo.value = null
  localError.value = ''
}

watch(
  () => [props.open, props.company],
  async () => {
    if (!props.open) return
    reset()
    await nextTick()
    nameInput.value?.focus()
  },
  { immediate: true },
)

watch(
  () => props.open,
  (value) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = value ? 'hidden' : ''
    }
  },
)

onBeforeUnmount(() => {
  revokePreview()
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})

function selectFile(file) {
  localError.value = ''
  if (!file) return
  if (!ALLOWED.includes(file.type)) {
    localError.value = t('companies.uploadType')
    return
  }
  if (file.size > MAX_BYTES) {
    localError.value = t('companies.uploadSize')
    return
  }
  revokePreview()
  logo.value = file
  preview.value = URL.createObjectURL(file)
}

function fileChanged(event) {
  selectFile(event.target.files?.[0])
  event.target.value = ''
}

function close() {
  if (!props.saving) emit('close')
}

function submit() {
  localError.value = ''
  if (!name.value.trim() || !location.value.trim() || !taxNumber.value.trim()) {
    localError.value = t('companies.requiredFields')
    return
  }
  if (!isEdit.value && !logo.value) {
    localError.value = t('companies.logoRequired')
    return
  }
  const fd = new FormData()
  fd.append('name', name.value.trim())
  fd.append('location', location.value.trim())
  fd.append('tax_number', taxNumber.value.trim())
  fd.append('is_main', isMain.value ? '1' : '0')
  if (logo.value) fd.append('logo', logo.value)
  emit('submit', fd)
}
</script>

<template>
  <div v-if="open" class="backdrop" @click.self="close" @keydown.esc="close">
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="company-dialog-title">
      <button type="button" class="dismiss" aria-label="Close" :disabled="saving" @click="close">
        ×
      </button>
      <h2 id="company-dialog-title">
        {{ isEdit ? t('companies.editTitle') : t('companies.addTitle') }}
      </h2>
      <form @submit.prevent="submit">
        <label class="field">
          <span>{{ t('companies.name') }} <b>*</b></span>
          <input
            ref="nameInput"
            v-model="name"
            type="text"
            maxlength="255"
            :placeholder="t('companies.namePlaceholder')"
            required
          />
          <small v-if="errors.name" class="field-error">{{ errors.name[0] }}</small>
        </label>
        <label class="field">
          <span>{{ t('companies.location') }} <b>*</b></span>
          <input
            v-model="location"
            type="text"
            maxlength="255"
            :placeholder="t('companies.locationPlaceholder')"
            required
          />
          <small v-if="errors.location" class="field-error">{{ errors.location[0] }}</small>
        </label>
        <label class="field">
          <span>{{ t('companies.tax') }} <b>*</b></span>
          <input
            v-model="taxNumber"
            type="text"
            maxlength="100"
            :placeholder="t('companies.taxPlaceholder')"
            required
          />
          <small v-if="errors.tax_number" class="field-error">{{ errors.tax_number[0] }}</small>
        </label>
        <label class="field logo-label">
          <span>{{ t('companies.logo') }} <b v-if="!isEdit">*</b></span>
          <div
            class="drop"
            tabindex="0"
            role="button"
            aria-label="Choose company logo"
            @click="fileInput?.click()"
            @keydown.enter.prevent="fileInput?.click()"
            @keydown.space.prevent="fileInput?.click()"
            @dragover.prevent
            @drop.prevent="selectFile($event.dataTransfer.files?.[0])"
          >
            <img v-if="preview" :src="preview" alt="New company logo preview" />
            <ProtectedImage
              v-else-if="existingLogoEndpoint"
              :endpoint="existingLogoEndpoint"
              alt="Current company logo"
            />
            <template v-else
              ><span class="upload-symbol">⇧</span><strong>{{ t('companies.upload') }}</strong
              ><small>{{ t('companies.uploadHint') }}</small></template
            >
          </div>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept="image/png,image/jpeg,image/webp"
            @change="fileChanged"
          />
          <small v-if="errors.logo" class="field-error">{{ errors.logo[0] }}</small>
        </label>
        <label class="main-row"
          ><input v-model="isMain" type="checkbox" /> {{ t('companies.main') }}</label
        >
        <p v-if="localError || error" class="notice" role="alert">{{ localError || error }}</p>
        <button class="submit" type="submit" :disabled="saving">
          {{ saving ? t('common.saving') : isEdit ? t('common.save') : t('common.add') }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.46);
  display: grid;
  place-items: center;
  z-index: 3000;
  padding: 20px;
  overflow-y: auto;
}
.dialog {
  position: relative;
  width: min(100%, 512px);
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px 24px;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.18);
  color: #202936;
  max-height: calc(100vh - 40px);
  overflow: auto;
}
h2 {
  text-align: center;
  font-size: 20px;
  margin: 0 0 24px;
  font-weight: 650;
}
.dismiss {
  position: absolute;
  right: 15px;
  top: 10px;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 25px;
  cursor: pointer;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0 0 17px;
}
.field span {
  font-size: 13px;
  font-weight: 600;
}
.field b {
  color: #dc2626;
}
.field > input {
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 14px;
  outline: 0;
}
.field > input:focus {
  border-color: #5c9fc8;
  box-shadow: 0 0 0 3px #5c9fc827;
}
.drop {
  height: 196px;
  border: 2px dashed #cfd7e1;
  border-radius: 12px;
  background: #fafbfd;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow: hidden;
}
.drop:focus-visible {
  outline: 3px solid #5c9fc8;
}
.drop img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.upload-symbol {
  font-size: 36px;
  color: #5c9fc8;
}
.drop strong {
  font-size: 15px;
  color: #475569;
}
.drop small {
  font-size: 12px;
  color: #64748b;
}
.hidden {
  display: none;
}
.main-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  margin: 5px 0 18px;
}
.main-row input {
  accent-color: #5c9fc8;
}
.submit {
  width: 100%;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: #5a9ec9;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.submit:hover:not(:disabled) {
  background: #4589b4;
}
.submit:disabled {
  opacity: 0.65;
  cursor: wait;
}
.notice,
.field-error {
  color: #b91c1c;
  font-size: 12px;
}
.notice {
  margin: 0 0 15px;
}
</style>
