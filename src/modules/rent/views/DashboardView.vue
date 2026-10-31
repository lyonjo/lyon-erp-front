<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n({ useScope: 'global' })
const ar = computed(() => String(locale.value).toLowerCase().startsWith('ar'))
const tr = (en, arabic) => (ar.value ? arabic : en)
const loading = ref(true)
const error = ref('')
const selectedBranch = ref(null)
const renewalTab = ref('licenses')
const data = ref({
  branches: [],
  vehicles: [],
  contracts: [],
  renewal: { licenses: [], insurances: [] },
  oil_maintenance: [],
})
const selectedBranchName = computed(
  () => data.value.branches.find((b) => Number(b.id) === Number(selectedBranch.value))?.name || '',
)
const renewalRows = computed(() => data.value.renewal?.[renewalTab.value] || [])
const tval = (v) => (v === null || v === undefined || v === '' ? '—' : String(v))

async function load(branchId = null) {
  loading.value = true
  error.value = ''
  try {
    const params = branchId ? { branch_id: branchId } : {}
    const result = await api.get('/rent/dashboard', { params })
    data.value = result.data?.data || result.data
    selectedBranch.value = data.value.selected_branch_id
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Unable to load dashboard.', 'تعذر تحميل لوحة التحكم.')
  } finally {
    loading.value = false
  }
}
function chooseBranch(id) {
  if (Number(id) !== Number(selectedBranch.value)) load(id)
}
onMounted(() => load())
</script>

<template>
  <section class="dashboard" :dir="ar ? 'rtl' : 'ltr'">
    <div v-if="error" class="error">
      {{ error }}
      <button type="button" @click="load(selectedBranch)">
        {{ tr('Retry', 'إعادة المحاولة') }}
      </button>
    </div>
    <div v-if="loading" class="loading">
      {{ tr('Loading dashboard...', 'جاري تحميل لوحة التحكم...') }}
    </div>

    <template v-else>
      <section class="panel">
        <header class="panel-heading">{{ tr('Available Vehicles', 'المركبات المتاحة') }}</header>
        <div class="panel-inner">
          <nav class="tabs branch-tabs" :aria-label="tr('Branches', 'الفروع')">
            <button
              v-for="branch in data.branches"
              :key="branch.id"
              type="button"
              :class="['tab', { active: Number(selectedBranch) === Number(branch.id) }]"
              @click="chooseBranch(branch.id)"
            >
              {{ branch.name }} ({{ branch.count }})
            </button>
          </nav>
          <div class="table-scroller">
            <table>
              <thead>
                <tr>
                  <th>{{ tr('Number', 'الرقم') }}</th>
                  <th>{{ tr('Name', 'الاسم') }}</th>
                  <th>{{ tr('Brand', 'العلامة التجارية') }}</th>
                  <th>{{ tr('Model Year', 'سنة الموديل') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in data.vehicles" :key="v.id">
                  <td>{{ tval(v.number) }}</td>
                  <td>{{ tval(v.name) }}</td>
                  <td>{{ tval(v.brand) }}</td>
                  <td>{{ tval(v.model_year) }}</td>
                </tr>
                <tr v-if="!data.vehicles?.length">
                  <td colspan="4" class="empty">
                    {{ tr('No vehicles for this branch.', 'لا توجد مركبات لهذا الفرع.') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="panel">
        <header class="panel-heading">{{ tr('Contracts', 'العقود') }}</header>
        <div class="panel-inner">
          <div class="section-label">
            {{ tr('Rental Car Contracts', 'عقود تأجير السيارات') }} ({{
              data.contracts?.length || 0
            }})
          </div>
          <div class="table-scroller">
            <table>
              <thead>
                <tr>
                  <th>{{ tr('Contract No.', 'رقم العقد') }}</th>
                  <th>{{ tr('Customer Name', 'اسم العميل') }}</th>
                  <th>{{ tr('Plate No.', 'رقم اللوحة') }}</th>
                  <th>{{ tr('Model', 'الموديل') }}</th>
                  <th>{{ tr('Drop Off Date', 'تاريخ الإرجاع') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in data.contracts" :key="c.id">
                  <td>{{ tval(c.contract_no) }}</td>
                  <td>{{ tval(c.customer_name) }}</td>
                  <td>{{ tval(c.plate_no) }}</td>
                  <td>{{ tval(c.model) }}</td>
                  <td>{{ tval(c.drop_off_date) }}</td>
                </tr>
                <tr v-if="!data.contracts?.length">
                  <td colspan="5" class="empty">
                    {{ tr('No upcoming contract returns.', 'لا توجد عقود إرجاع قادمة.') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="panel">
        <header class="panel-heading">{{ tr('Renewal Alert', 'تنبيهات التجديد') }}</header>
        <div class="panel-inner">
          <nav class="tabs" :aria-label="tr('Renewal type', 'نوع التجديد')">
            <button
              type="button"
              :class="['tab', { active: renewalTab === 'licenses' }]"
              @click="renewalTab = 'licenses'"
            >
              {{ tr('Vehicle License', 'ترخيص المركبات') }} ({{
                data.renewal?.licenses?.length || 0
              }})
            </button>
            <button
              type="button"
              :class="['tab', { active: renewalTab === 'insurances' }]"
              @click="renewalTab = 'insurances'"
            >
              {{ tr('Vehicle Insurance', 'تأمين المركبات') }} ({{
                data.renewal?.insurances?.length || 0
              }})
            </button>
          </nav>
          <div class="table-scroller">
            <table>
              <thead>
                <tr>
                  <th>{{ tr('Plate No.', 'رقم اللوحة') }}</th>
                  <th>{{ tr('Brand', 'العلامة التجارية') }}</th>
                  <th>{{ tr('Type', 'النوع') }}</th>
                  <th>{{ tr('Model', 'الموديل') }}</th>
                  <th>
                    {{
                      renewalTab === 'licenses'
                        ? tr('License Expiry Date', 'انتهاء الترخيص')
                        : tr('Insurance Expiry Date', 'انتهاء التأمين')
                    }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in renewalRows" :key="v.id">
                  <td>{{ tval(v.plate_no) }}</td>
                  <td>{{ tval(v.brand) }}</td>
                  <td>{{ tval(v.model_name) }}</td>
                  <td>{{ tval(v.model_year) }}</td>
                  <td>{{ tval(v.expiry_date) }}</td>
                </tr>
                <tr v-if="!renewalRows.length">
                  <td colspan="5" class="empty">
                    {{ tr('No renewal alerts.', 'لا توجد تنبيهات تجديد.') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="panel">
        <header class="panel-heading">
          {{ tr('Vehicles Maintenance', 'صيانة المركبات') }} ({{
            data.oil_maintenance?.length || 0
          }})
        </header>
        <div class="panel-inner maintenance-inner">
          <div class="table-scroller">
            <table>
              <thead>
                <tr>
                  <th>{{ tr('Plate No.', 'رقم اللوحة') }}</th>
                  <th>{{ tr('Company', 'الشركة') }}</th>
                  <th>{{ tr('Brand', 'العلامة التجارية') }}</th>
                  <th>{{ tr('Type', 'النوع') }}</th>
                  <th>{{ tr('Model', 'الموديل') }}</th>
                  <th>{{ tr('Maintenance', 'الصيانة') }}</th>
                  <th>{{ tr('KM Since Service', 'كم منذ الصيانة') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in data.oil_maintenance" :key="m.id">
                  <td>{{ tval(m.plate_no) }}</td>
                  <td>{{ tval(m.company) }}</td>
                  <td>{{ tval(m.brand) }}</td>
                  <td>{{ tval(m.model_name) }}</td>
                  <td>{{ tval(m.model_year) }}</td>
                  <td>{{ tr('Oil Change', 'تغيير الزيت') }}</td>
                  <td>{{ tval(m.km_since_service) }}</td>
                </tr>
                <tr v-if="!data.oil_maintenance?.length">
                  <td colspan="7" class="empty">
                    {{ tr('No oil maintenance alerts.', 'لا توجد تنبيهات تغيير زيت.') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 22px 16px 36px;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #13283e;
}
.panel {
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px #10263e12;
}
.panel-heading {
  background: linear-gradient(180deg, #d8e7f1, #c6d7e3);
  padding: 23px 20px;
  text-align: center;
  font-size: 24px;
  font-weight: 750;
  color: #081c34;
}
.panel-inner {
  padding: 28px clamp(18px, 4vw, 70px) 34px;
  min-height: 220px;
}
.tabs {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 10px 0 24px;
  overflow-x: auto;
  white-space: nowrap;
  padding: 7px 0 14px;
}
.branch-tabs {
  justify-content: safe center;
}
.tab {
  border: 0;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  color: #738096;
  font-size: 17px;
  font-weight: 700;
  padding: 8px 9px;
  border-bottom: 2px solid transparent;
}
.tab.active {
  color: #101b2a;
  border-bottom-color: #5599be;
}
.table-scroller {
  max-height: 360px;
  overflow: auto;
  border: 1px solid #dfe7ef;
  border-radius: 15px;
  box-shadow: 0 2px 7px #0000000b;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  table-layout: auto;
  background: #fff;
}
th,
td {
  text-align: center !important;
  vertical-align: middle;
  padding: 18px 12px;
  border-bottom: 1px solid #e1e7ed;
  white-space: nowrap;
}
th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f6f9fc;
  color: #8e9aac;
  font-weight: 650;
}
td {
  font-size: 14px;
  color: #223247;
}
tr:last-child td {
  border-bottom: 0;
}
.empty {
  color: #8a96a5;
  padding: 36px 10px;
}
.section-label {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  margin: 4px 0 30px;
}
.maintenance-inner {
  padding-top: 38px;
}
.loading {
  text-align: center;
  padding: 70px;
  color: #758396;
}
.error {
  padding: 16px;
  border-radius: 10px;
  background: #fff1f2;
  color: #ad293a;
}
.error button {
  margin-inline-start: 12px;
  background: white;
  border: 1px solid #d2a2a9;
  border-radius: 7px;
  padding: 5px 12px;
  cursor: pointer;
}
@media (max-width: 700px) {
  .dashboard {
    padding: 12px 0;
  }
  .panel-heading {
    font-size: 20px;
    padding: 16px;
  }
  .panel-inner {
    padding: 15px;
  }
  .tabs {
    gap: 12px;
    justify-content: flex-start;
  }
  .tab {
    font-size: 13px;
  }
  th,
  td {
    padding: 12px 10px;
  }
}
</style>
