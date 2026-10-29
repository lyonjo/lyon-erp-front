<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import CountrySearchSelect from './CountrySearchSelect.vue'
import CompanyAttachmentImage from './CompanyAttachmentImage.vue'
import api from '@/api'
import { dialingOptions } from '../constants/allCountries'
const { t, te } = useI18n()
const tr = (label) => (te(`rentUi.${label}`) ? t(`rentUi.${label}`) : label)
const props = defineProps({
  mode: { type: String, default: 'create' },
  company: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
  banner: { type: String, default: '' },
})
const emit = defineEmits(['submit'])
const router = useRouter()
const isEdit = computed(() => props.mode === 'edit')
const form = reactive({
  name: '',
  email: '',
  admin_name: '',
  country_code: '',
  phone: '',
  address: '',
  is_multi_contract: true,
  is_blacklist: false,
  note: '',
})
watch(
  () => props.company,
  (c) => {
    if (!c) return
    for (const key of Object.keys(form))
      form[key] = key.startsWith('is_') ? Boolean(c[key]) : (c[key] ?? '')
  },
  { immediate: true },
)
const codeOptions = computed(() =>
  form.country_code && !dialingOptions.some((c) => c.value === form.country_code)
    ? [
        { label: form.country_code, value: form.country_code, search: form.country_code },
        ...dialingOptions,
      ]
    : dialingOptions,
)
const attachments = ref([])
const removedAttachmentIds = ref([])
const existingAttachments = computed(() => props.company?.attachments || [])
const visibleAttachments = computed(() =>
  existingAttachments.value.filter((a) => !removedAttachmentIds.value.includes(a.id)),
)
const fileError = ref('')
function addFiles(event) {
  fileError.value = ''
  const files = Array.from(event.target.files || [])
  const accepted = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  for (const file of files) {
    if (!accepted.includes(file.type) || file.size > 10 * 1024 * 1024) {
      fileError.value = tr('Only PDF, images or Word documents up to 10 MB are allowed.')
      continue
    }
    attachments.value.push(file)
  }
  event.target.value = ''
}
const downloading = ref(null)
const downloadError = ref('')
async function downloadAttachment(attachment) {
  if (!props.company?.id || downloading.value) return
  downloading.value = attachment.id
  downloadError.value = ''
  try {
    const response = await api.get(
      `/rent/customer-companies/${props.company.id}/attachments/${attachment.id}/download`,
      { responseType: 'blob' },
    )
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = attachment.original_name || attachment.name || 'attachment'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  } catch (error) {
    downloadError.value = error.response?.data?.message || tr('Could not download attachment.')
  } finally {
    downloading.value = null
  }
}
function removePending(index) {
  attachments.value.splice(index, 1)
}
function removeExisting(id) {
  if (!removedAttachmentIds.value.includes(id)) removedAttachmentIds.value.push(id)
}
function undoRemove(id) {
  removedAttachmentIds.value = removedAttachmentIds.value.filter((x) => x !== id)
}

const localErrors = ref({})
const localBanner = ref('')
const allErrors = computed(() => ({ ...props.errors, ...localErrors.value }))
const err = (key) => allErrors.value[key]?.[0] ?? ''
const shownBanner = computed(() => localBanner.value || props.banner)
function submit() {
  if (props.saving) return
  localErrors.value = {}
  localBanner.value = ''
  if (!form.name.trim()) localErrors.value.name = [tr('Company name is required.')]
  if (!form.email.trim()) localErrors.value.email = [tr('Email is required.')]
  if (Object.keys(localErrors.value).length) {
    localBanner.value = tr('Please fix the highlighted fields.')
    return
  }
  const fd = new FormData()
  for (const [key, value] of Object.entries(form)) {
    if ((key === 'is_blacklist' || key === 'note') && !isEdit.value) continue
    if (typeof value === 'boolean') fd.append(key, value ? 1 : 0)
    else if (value !== '' || isEdit.value) fd.append(key, value)
  }
  emit('submit', {
    fd,
    attachments: [...attachments.value],
    removedAttachmentIds: [...removedAttachmentIds.value],
  })
}
const back = () =>
  router.push(
    isEdit.value && props.company
      ? `/rent/customer-companies/${props.company.id}`
      : '/rent/customer-companies',
  )
</script>
<template>
  <div class="page">
    <div class="topbar">
      <button type="button" class="back" @click="back">{{ tr('Back') }}</button
      ><button class="btn-save" :disabled="saving" @click="submit">
        {{ tr(saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save') }}
      </button>
    </div>
    <div class="card">
      <p v-if="shownBanner" class="banner">{{ shownBanner }}</p>
      <div class="grid">
        <label class="field full"
          ><span>{{ tr('Company Name') }}</span
          ><input v-model="form.name" :placeholder="tr('Enter company name')" /><small
            v-if="err('name')"
            >{{ err('name') }}</small
          ></label
        >
        <label class="field full"
          ><span>{{ tr('Email') }}</span
          ><input v-model="form.email" type="email" :placeholder="tr('Enter email')" /><small
            v-if="err('email')"
            >{{ err('email') }}</small
          ></label
        >
        <label class="field full"
          ><span>{{ tr('Admin Name') }}</span
          ><input v-model="form.admin_name" :placeholder="tr('Enter admin name')" /><small
            v-if="err('admin_name')"
            >{{ err('admin_name') }}</small
          ></label
        >
        <div class="phone-row full" dir="ltr">
          <div class="field country-field">
            <span>{{ tr('Country Code') }}</span
            ><CountrySearchSelect
              v-model="form.country_code"
              :options="codeOptions"
              :placeholder="tr('Search country or code...')"
              :invalid="Boolean(err('country_code'))"
            /><small v-if="err('country_code')">{{ err('country_code') }}</small>
          </div>
          <label class="field"
            ><span>{{ tr('Phone Number') }}</span
            ><input
              v-model="form.phone"
              type="tel"
              dir="ltr"
              :placeholder="tr('Enter phone number')"
            /><small v-if="err('phone')">{{ err('phone') }}</small></label
          >
        </div>
        <label class="field full"
          ><span>{{ tr('Address (Country - State - Street)') }}</span
          ><input v-model="form.address" :placeholder="tr('Enter address')" /><small
            v-if="err('address')"
            >{{ err('address') }}</small
          ></label
        >
        <div class="attachments full">
          <strong>{{ tr('Company Attachments') }}</strong>
          <p class="attachment-hint">
            {{ tr('Add multiple documents. PDF, JPG, PNG, WEBP or Word; 10 MB per file.') }}
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            @change="addFiles"
          />
          <small v-if="fileError" class="error">{{ fileError }}</small>
          <small v-if="err('attachments')" class="error">{{ err('attachments') }}</small>
          <div v-for="(file, index) in attachments" :key="index" class="attachment-entry">
            <CompanyAttachmentImage :file="file" /><span
              >{{ file.name }} ({{ (file.size / 1024 / 1024).toFixed(2) }} MB)</span
            ><button type="button" @click="removePending(index)">{{ tr('Remove') }}</button>
          </div>
          <div
            v-for="attachment in visibleAttachments"
            :key="attachment.id"
            class="attachment-entry"
          >
            <CompanyAttachmentImage :attachment="attachment" :company-id="props.company?.id" />
            <span
              >{{ attachment.original_name || attachment.name }}
              <small v-if="attachment.size"
                >({{ (attachment.size / 1024 / 1024).toFixed(2) }} MB)</small
              ></span
            >
            <div class="attachment-actions">
              <button
                type="button"
                :disabled="downloading === attachment.id"
                @click="downloadAttachment(attachment)"
              >
                {{ tr(downloading === attachment.id ? 'Downloading…' : 'Download') }}
              </button>
              <button type="button" @click="removeExisting(attachment.id)">
                {{ tr('Remove') }}
              </button>
            </div>
          </div>
          <small v-if="downloadError" class="error">{{ downloadError }}</small>
          <div
            v-for="attachment in existingAttachments.filter((a) =>
              removedAttachmentIds.includes(a.id),
            )"
            :key="'remove-' + attachment.id"
            class="attachment-entry pending-delete"
          >
            <span
              >{{ attachment.original_name || attachment.name }} — {{ tr('Will be removed') }}</span
            ><button type="button" @click="undoRemove(attachment.id)">{{ tr('Undo') }}</button>
          </div>
        </div>
        <label v-if="isEdit" class="field full"
          ><span>{{ tr('Note') }}</span
          ><textarea
            v-model="form.note"
            maxlength="1000"
            rows="3"
            :placeholder="tr('Enter note')"
          /><small v-if="err('note')">{{ err('note') }}</small></label
        >
        <div class="toggles-row full">
          <div class="switch-card">
            <div>
              <strong>{{ tr('Multi Contract') }}</strong>
              <p>
                {{
                  tr('Allow this company to hold more than one active contract at the same time.')
                }}
              </p>
            </div>
            <input type="checkbox" v-model="form.is_multi_contract" />
          </div>
          <div class="switch-card">
            <div>
              <strong>{{ tr('Black List') }}</strong>
              <p>{{ tr('Mark this company as blacklisted.') }}</p>
            </div>
            <input type="checkbox" v-model="form.is_blacklist" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.page {
  padding: 8px 4px 40px;
  color: #1f2937;
}
.title {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 28px;
  color: #1e2433;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.search-box {
  position: relative;
  min-width: 200px;
  width: 300px;
}
.search-box input {
  width: 100%;
  height: 36px;
  box-sizing: border-box;
  border: 2px solid #9ca3af;
  border-radius: 8px;
  padding: 0 14px;
  background: #fff;
  font-size: 14px;
}
.selector {
  height: 36px;
  padding: 0 12px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #6b7280;
}
.per-page {
  margin-inline-start: auto;
}
.btn-new,
.btn-edit,
.btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: #4f93b8;
  color: white;
  padding: 9px 18px;
  cursor: pointer;
  font-size: 14px;
}
.btn-new:hover,
.btn-edit:hover,
.btn-save:hover {
  background: #3f83a8;
}
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: white;
  overflow-x: auto;
}
.table-card.loading {
  opacity: 0.6;
}
table {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
}
th,
td {
  padding: 14px 16px;
  text-align: center;
  font-size: 14px;
  border-bottom: 1px solid #eef0f3;
}
th.left,
td.left {
  text-align: start;
}
th {
  color: #9ca3af;
  font-weight: 500;
  font-size: 13px;
}
.badge {
  display: inline-block;
  min-width: 36px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
}
.good {
  color: #16a34a;
  background: #dcfce7;
}
.bad {
  color: #dc2626;
  background: #fee2e2;
}
.customer {
  background: #dbeafe;
  color: #2563eb;
}
.company {
  background: #f3e8ff;
  color: #7e22ce;
}
.actions {
  display: flex;
  gap: 14px;
  justify-content: center;
}
.action {
  border: 0;
  background: transparent;
  color: #111827;
  cursor: pointer;
}
.action:hover {
  color: #4f93b8;
}
.empty {
  padding: 32px;
  color: #6b7280;
  text-align: center;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
}
.pagination button {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.api-error {
  padding: 14px 18px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.api-error button {
  background: white;
  border: 1px solid #dc2626;
  border-radius: 6px;
  padding: 7px 12px;
  color: #b91c1c;
  cursor: pointer;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.back {
  border: 0;
  background: none;
  color: #6b7280;
  cursor: pointer;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 28px 24px;
  max-width: 600px;
  margin: 0 auto;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 20px;
}
.full {
  grid-column: 1/-1;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field > span {
  font-size: 13px;
  font-weight: 600;
}
.field input,
.field select {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  font: inherit;
}
.field small {
  color: #dc2626;
}
.switch-card {
  grid-column: 1/-1;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  background: #fafbfc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.switch-card p {
  font-size: 12px;
  color: #6b7280;
}
.state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}
.detail-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  background: #fff;
  max-width: 600px;
  margin: auto;
}
.details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.details dt {
  font-size: 12px;
  color: #9ca3af;
}
.details dd {
  margin: 4px 0 0;
  font-size: 14px;
}
.banner {
  padding: 10px 14px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  margin-bottom: 20px;
}
@media (max-width: 640px) {
  .grid,
  .details {
    grid-template-columns: 1fr;
  }
  .toolbar > * {
    flex: 1;
  }
  .per-page {
    margin-inline-start: 0;
  }
}
.phone-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px 20px;
  align-items: start;
}
.phone-row .field {
  min-width: 0;
}
.phone-row .field > span {
  direction: inherit;
  text-align: left;
}
.attachments {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.attachment-hint {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}
.attachment-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  overflow-wrap: anywhere;
}
.attachment-entry button {
  color: #c2410c;
  background: none;
  border: 0;
  cursor: pointer;
}
.pending-delete {
  opacity: 0.6;
}
.error {
  color: #dc2626;
}
@media (max-width: 640px) {
  .phone-row {
    grid-template-columns: 1fr;
  }
}
</style>
<style scoped>
.attachment-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.attachment-actions button:first-child {
  color: #2877a6;
}
.attachment-actions button:disabled {
  opacity: 0.5;
  cursor: wait;
}
</style>

<style scoped>
.page > .topbar {
  width: min(100%, 650px);
  box-sizing: border-box;
  margin: 0 auto 16px;
  padding: 0 24px;
  direction: ltr;
}
.page > .card {
  box-sizing: border-box;
  width: min(100%, 650px);
}
.attachment-entry > span {
  flex: 1;
  min-width: 0;
}
@media (max-width: 640px) {
  .page > .topbar {
    padding: 0 8px;
  }
}
</style>

<style scoped>
.toggles-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.toggles-row .switch-card {
  grid-column: auto;
  min-width: 0;
}
.field textarea {
  border: 1px solid #d1d5db;
  border-radius: 9px;
  padding: 12px;
  box-sizing: border-box;
  font: inherit;
  width: 100%;
  resize: vertical;
}
@media (max-width: 640px) {
  .toggles-row {
    grid-template-columns: 1fr;
  }
}
</style>
