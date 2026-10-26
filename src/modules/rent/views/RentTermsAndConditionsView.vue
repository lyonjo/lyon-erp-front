<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const paragraphEn = ref('')
const paragraphAr = ref('')
const clauses = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const preview = ref(false)
let keySeed = 0
const newClause = (en = '', ar = '') => ({ uid: ++keySeed, text_en: en, text_ar: ar })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/terms-and-conditions')
    const v = data.data || {}
    paragraphEn.value = v.paragraph_en || ''
    paragraphAr.value = v.paragraph_ar || ''
    clauses.value = (v.clauses || []).map((c) => newClause(c.text_en || '', c.text_ar || ''))
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Unable to load contract terms.', 'تعذر تحميل شروط العقود.')
  } finally {
    loading.value = false
  }
}
function addClause() {
  clauses.value.push(newClause())
}
function removeClause(i) {
  clauses.value.splice(i, 1)
}
function moveClause(i, direction) {
  const j = i + direction
  if (j < 0 || j >= clauses.value.length) return
  const list = [...clauses.value]
  ;[list[i], list[j]] = [list[j], list[i]]
  clauses.value = list
}
async function save() {
  error.value = ''
  success.value = ''
  if (clauses.value.some((c) => !c.text_en.trim() || !c.text_ar.trim())) {
    error.value = tr(
      'Each clause needs Arabic and English text.',
      'كل بند يحتاج نصاً بالعربية والإنجليزية.',
    )
    return
  }
  saving.value = true
  try {
    await api.put('/rent/terms-and-conditions', {
      paragraph_en: paragraphEn.value,
      paragraph_ar: paragraphAr.value,
      clauses: clauses.value.map((c) => ({ text_en: c.text_en.trim(), text_ar: c.text_ar.trim() })),
    })
    success.value = tr('Contract terms saved successfully.', 'تم حفظ شروط العقود بنجاح.')
  } catch (e) {
    const errors = e.response?.data?.errors
    error.value =
      (errors ? Object.values(errors).flat().join(' ') : '') ||
      e.response?.data?.message ||
      tr('Could not save terms.', 'تعذر حفظ الشروط.')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="terms-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="heading">
      <div>
        <h2>{{ tr('Terms & Conditions', 'الشروط والأحكام') }}</h2>
        <p>
          {{
            tr(
              'Edit the bilingual text printed on rental contracts.',
              'إدارة النصوص العربية والإنجليزية التي تظهر في عقود التأجير.',
            )
          }}
        </p>
      </div>
      <div class="heading-actions">
        <button type="button" class="light-btn" :disabled="loading" @click="preview = !preview">
          {{ preview ? tr('Edit', 'تعديل') : tr('Preview', 'معاينة') }}
        </button>
        <button
          type="button"
          class="primary-btn"
          :disabled="loading || saving || preview"
          @click="save"
        >
          {{ saving ? tr('Saving...', 'جاري الحفظ...') : tr('Save Changes', 'حفظ التغييرات') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="panel message">
      {{ tr('Loading contract terms...', 'جاري تحميل شروط العقود...') }}
    </div>
    <template v-else>
      <div v-if="error" role="alert" class="alert error">
        {{ error }}
        <button type="button" class="retry" @click="load">
          {{ tr('Reload', 'إعادة التحميل') }}
        </button>
      </div>
      <div v-if="success" role="status" class="alert success">{{ success }}</div>

      <template v-if="!preview">
        <div class="panel">
          <h3>{{ tr('Terms & Conditions Paragraph', 'فقرة الشروط والأحكام') }}</h3>
          <p class="hint">
            {{
              tr(
                'This is the paragraph displayed beside the contract summary.',
                'هذه الفقرة تظهر بجانب ملخص العقد.',
              )
            }}
          </p>
          <div class="two-cols">
            <label class="field"
              ><strong>{{ tr('English paragraph', 'الفقرة الإنجليزية') }}</strong
              ><textarea
                v-model="paragraphEn"
                rows="9"
                dir="ltr"
                :placeholder="
                  tr('Enter contract paragraph in English...', 'أدخل نص الفقرة بالإنجليزية...')
                "
              />
            </label>
            <label class="field"
              ><strong>{{ tr('Arabic paragraph', 'الفقرة العربية') }}</strong
              ><textarea
                v-model="paragraphAr"
                rows="9"
                dir="rtl"
                :placeholder="tr('Enter Arabic translation...', 'أدخل نص الفقرة بالعربية...')"
              />
            </label>
          </div>
        </div>

        <div class="panel">
          <div class="section-heading">
            <div>
              <h3>{{ tr('Contract Terms (Numbered Clauses)', 'شروط العقد (بنود مرقمة)') }}</h3>
              <p class="hint">
                {{
                  tr(
                    'Clause order is preserved in the contract PDF.',
                    'يتم الحفاظ على ترتيب البنود في ملف العقد PDF.',
                  )
                }}
              </p>
            </div>
            <button type="button" class="light-btn" @click="addClause">
              + {{ tr('Add Clause', 'إضافة بند') }}
            </button>
          </div>
          <div v-if="!clauses.length" class="empty">
            {{
              tr(
                'No clauses yet. Select Add Clause to begin.',
                'لا توجد بنود. اضغط إضافة بند للبدء.',
              )
            }}
          </div>
          <div v-for="(clause, index) in clauses" :key="clause.uid" class="clause">
            <div class="clause-head">
              <strong>{{ tr('Clause', 'البند') }} {{ index + 1 }}</strong>
              <div class="clause-actions">
                <button type="button" :disabled="index === 0" @click="moveClause(index, -1)">
                  ↑</button
                ><button
                  type="button"
                  :disabled="index === clauses.length - 1"
                  @click="moveClause(index, 1)"
                >
                  ↓</button
                ><button type="button" class="remove" @click="removeClause(index)">
                  {{ tr('Remove', 'حذف') }}
                </button>
              </div>
            </div>
            <div class="two-cols">
              <label class="field"
                ><strong>{{ tr('English', 'الإنجليزية') }}</strong
                ><textarea v-model="clause.text_en" dir="ltr" rows="3" /></label
              ><label class="field"
                ><strong>{{ tr('Arabic', 'العربية') }}</strong
                ><textarea v-model="clause.text_ar" dir="rtl" rows="3" />
              </label>
            </div>
          </div>
          <div class="bottom-actions">
            <button type="button" class="primary-btn" :disabled="saving" @click="save">
              {{ saving ? tr('Saving...', 'جاري الحفظ...') : tr('Save Changes', 'حفظ التغييرات') }}
            </button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="panel">
          <h3>{{ tr('Contract PDF Text Preview', 'معاينة نص العقد') }}</h3>
          <div class="preview-grid">
            <div dir="ltr">
              <h4>TERMS & CONDITIONS</h4>
              <p>{{ paragraphEn || '—' }}</p>
            </div>
            <div dir="rtl">
              <h4>الشروط والأحكام</h4>
              <p>{{ paragraphAr || '—' }}</p>
            </div>
          </div>
          <div class="preview-grid preview-clauses">
            <div dir="ltr">
              <h4>Contract Terms</h4>
              <p v-for="(c, i) in clauses" :key="c.uid">{{ i + 1 }}. {{ c.text_en }}</p>
            </div>
            <div dir="rtl">
              <h4>شروط العقد</h4>
              <p v-for="(c, i) in clauses" :key="c.uid">{{ i + 1 }} - {{ c.text_ar }}</p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.terms-page {
  padding: 20px 24px;
  color: #0b2848;
}
.heading,
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.heading {
  margin-bottom: 25px;
}
.heading h2 {
  font-size: 24px;
  margin: 0;
}
.heading p,
.hint {
  font-size: 13px;
  color: #7d8fa8;
  margin: 8px 0 16px;
}
.heading-actions,
.clause-actions {
  display: flex;
  gap: 9px;
  align-items: center;
}
.primary-btn,
.light-btn {
  border-radius: 22px;
  padding: 9px 21px;
  font-weight: 600;
  cursor: pointer;
}
.primary-btn {
  background: #619ec4;
  border: 1px solid #619ec4;
  color: white;
}
.light-btn {
  background: #fff;
  border: 1px solid #cedde8;
  color: #24415e;
}
.primary-btn:disabled,
.light-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.panel {
  border: 1px solid #d9e2ea;
  border-radius: 16px;
  background: #fff;
  padding: 25px;
  margin-bottom: 21px;
}
.panel h3 {
  font-size: 17px;
  margin: 0;
}
.two-cols,
.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.field strong {
  font-weight: 600;
}
.field textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid #ced9e5;
  border-radius: 10px;
  padding: 13px;
  color: #153453;
  font: inherit;
  line-height: 1.6;
  min-height: 95px;
}
.field textarea:focus {
  outline: 2px solid #a3c9e3;
}
.clause {
  border: 1px solid #e3e9ef;
  border-radius: 12px;
  padding: 16px;
  margin-top: 15px;
}
.clause-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.clause-actions button {
  cursor: pointer;
  background: white;
  border: 1px solid #d6e0e9;
  border-radius: 8px;
  padding: 6px 10px;
}
.clause-actions button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.clause-actions .remove {
  color: #c23b4d;
}
.bottom-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 22px;
}
.alert {
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 15px;
  font-size: 13px;
}
.error {
  background: #fff0f2;
  color: #ad3049;
}
.success {
  background: #ebf8f1;
  color: #17794b;
}
.retry {
  border: 0;
  background: transparent;
  text-decoration: underline;
  cursor: pointer;
}
.empty,
.message {
  text-align: center;
  color: #7d8fa8;
  padding: 30px;
}
.preview-grid {
  margin-top: 20px;
  border-bottom: 1px solid #e3e9ef;
  padding-bottom: 20px;
}
.preview-grid p {
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 13px;
}
.preview-grid h4 {
  color: #477da7;
}
@media (max-width: 760px) {
  .two-cols,
  .preview-grid {
    grid-template-columns: 1fr;
  }
  .panel {
    padding: 15px;
  }
  .terms-page {
    padding: 10px;
  }
}
</style>
