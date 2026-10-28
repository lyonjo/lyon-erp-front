<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminLogs } from '@/composables/useAdminLogs'

// Page-local translations inherit the application's global language switcher.
const { t, locale } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    en: {
      title: 'Admin Logs',
      subtitle: 'Review activity recorded by administrators and employees.',
      search: 'Search action, details or employee…',
      pageSize: '{size} per page',
      actionId: 'Action ID',
      employeeId: 'Employee ID',
      action: 'Action',
      details: 'Details',
      date: 'Date',
      time: 'Time',
      empty: 'No activity logs found',
      loading: 'Loading activity logs…',
      retry: 'Try again',
      previous: 'Prev',
      next: 'Next',
      of: 'of',
      records: 'records',
      unknown: '—',
      actions: {
        created: 'Created',
        updated: 'Updated',
        deleted: 'Deleted',
        login: 'Login',
        logout: 'Logout',
      },
    },
    ar: {
      title: 'سجل العمليات',
      subtitle: 'مراجعة العمليات المسجلة للمسؤولين والموظفين.',
      search: 'ابحث عن العملية أو التفاصيل أو الموظف…',
      pageSize: '{size} لكل صفحة',
      actionId: 'رقم العملية',
      employeeId: 'رقم الموظف',
      action: 'العملية',
      details: 'التفاصيل',
      date: 'التاريخ',
      time: 'الوقت',
      empty: 'لا توجد عمليات مسجلة',
      loading: 'جارٍ تحميل سجل العمليات…',
      retry: 'إعادة المحاولة',
      previous: 'السابق',
      next: 'التالي',
      of: 'من',
      records: 'سجل',
      unknown: '—',
      actions: {
        created: 'إنشاء',
        updated: 'تعديل',
        deleted: 'حذف',
        login: 'تسجيل الدخول',
        logout: 'تسجيل الخروج',
      },
    },
  },
})

const { rows, meta, search, page, perPage, loading, error, fetchAdminLogs } = useAdminLogs()
perPage.value = 50
const isArabic = computed(() => locale.value === 'ar')

function display(value) {
  return value === null || value === undefined || value === '' ? '—' : value
}

function actionLabel(action) {
  const key = String(action ?? '').toLowerCase()
  const known = ['created', 'updated', 'deleted', 'login', 'logout']
  return known.includes(key) ? t(`actions.${key}`) : display(action)
}

function actionClass(action) {
  const value = String(action ?? '').toLowerCase()
  if (['created', 'create'].includes(value)) return 'positive'
  if (['deleted', 'delete'].includes(value)) return 'negative'
  if (['updated', 'update'].includes(value)) return 'neutral'
  return 'default'
}

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.last_page) || n === page.value) return
  page.value = n
}
</script>

<template>
  <section class="logs-page" :dir="isArabic ? 'rtl' : 'ltr'">
    <header class="page-heading">
      <h1>{{ t('title') }}</h1>
      <p>{{ t('subtitle') }}</p>
    </header>

    <div class="toolbar ui-table-toolbar">
      <div class="search-box">
        <svg
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="t('search')"
          :aria-label="t('search')"
        />
      </div>

      <select v-model.number="perPage" class="page-size" :aria-label="t('records')">
        <option v-for="size in [10, 15, 25, 50, 100]" :key="size" :value="size">
          {{ t('pageSize', { size }) }}
        </option>
      </select>
    </div>

    <div v-if="error" class="error-banner" role="alert">
      <span>{{ error }}</span>
      <button type="button" @click="fetchAdminLogs">{{ t('retry') }}</button>
    </div>

    <div class="table-card" :class="{ busy: loading }" :aria-busy="loading">
      <div class="table-scroll">
        <table class="ui-standardized-table">
          <thead>
            <tr>
              <th>{{ t('actionId') }}</th>
              <th>{{ t('employeeId') }}</th>
              <th>{{ t('action') }}</th>
              <th class="details-heading">{{ t('details') }}</th>
              <th>{{ t('date') }}</th>
              <th>{{ t('time') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.action_id">
              <td class="mono" dir="ltr">{{ display(row.action_id) }}</td>
              <td class="mono" dir="ltr">{{ display(row.employee_id) }}</td>
              <td>
                <span class="action-badge" :class="actionClass(row.action)">
                  {{ actionLabel(row.action) }}
                </span>
              </td>
              <td class="details-cell" dir="auto">{{ display(row.details) }}</td>
              <td class="mono" dir="ltr">{{ display(row.date) }}</td>
              <td class="mono" dir="ltr">{{ display(row.time) }}</td>
            </tr>
            <tr v-if="loading && !rows.length">
              <td colspan="6" class="empty">{{ t('loading') }}</td>
            </tr>
            <tr v-else-if="!loading && !error && !rows.length">
              <td colspan="6" class="empty">{{ t('empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="ui-legacy-pager pagination">
      <button type="button" :disabled="loading || page <= 1" @click="page--">
        {{ t('previous') }}
      </button>
      <span class="page-summary">
        <span dir="ltr">{{ meta.current_page }} / {{ meta.last_page }}</span>
        <span>· {{ meta.total }} {{ t('records') }}</span>
      </span>
      <button type="button" :disabled="loading || page >= meta.last_page" @click="page++">
        {{ t('next') }}
      </button>
    </div>
    <StandardTablePager
      :page="page"
      :last-page="meta.last_page"
      :disabled="loading"
      @change="uiTableGoToPage"
    />
  </section>
</template>

<style scoped>
.logs-page {
  padding: 8px 4px 32px;
  color: #1f2937;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
}
.page-heading {
  margin-bottom: 25px;
}
.page-heading h1 {
  color: #1e2433;
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 6px;
}
.page-heading p {
  color: #758092;
  font-size: 14px;
  margin: 0;
}
.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 20px;
}
.search-box {
  position: relative;
  flex: 0 1 360px;
  min-width: 230px;
}
.search-box svg {
  position: absolute;
  inset-inline-start: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
}
.search-box input {
  width: 100%;
  height: 40px;
  box-sizing: border-box;
  padding-inline: 38px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  outline: none;
  background: #fff;
  color: #1f2937;
  font-size: 14px;
}
.search-box input:focus,
.page-size:focus {
  border-color: #4f93b8;
  box-shadow: 0 0 0 3px rgba(79, 147, 184, 0.12);
}
.page-size {
  margin-inline-start: auto;
  width: 160px;
  height: 40px;
  padding-inline: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #fff;
  font-size: 14px;
  color: #475569;
}
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  transition: opacity 0.15s;
}
.table-card.busy {
  opacity: 0.65;
}
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 810px;
  border-collapse: collapse;
}
th,
td {
  padding: 15px 16px;
  font-size: 14px;
  text-align: center;
}
th {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}
tbody td {
  border-bottom: 1px solid #eef0f3;
}
tbody tr:last-child td {
  border-bottom: 0;
}
tbody tr:hover {
  background: #fafbfc;
}
.details-heading,
.details-cell {
  text-align: start;
}
.details-cell {
  min-width: 230px;
  max-width: 450px;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.mono {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.action-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  padding: 4px 12px;
  background: #eef2f6;
  color: #475569;
}
.action-badge.positive {
  background: #dcfce7;
  color: #15803d;
}
.action-badge.negative {
  background: #fee2e2;
  color: #b91c1c;
}
.action-badge.neutral {
  background: #dbeafe;
  color: #1d4ed8;
}
.empty {
  padding: 38px;
  color: #94a3b8;
  text-align: center;
}
.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #fef2f2;
  border-radius: 9px;
  color: #b91c1c;
  font-size: 14px;
}
.error-banner button {
  border: 1px solid #fca5a5;
  background: #fff;
  border-radius: 7px;
  padding: 7px 12px;
  cursor: pointer;
  color: #b91c1c;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 20px 8px;
}
.pagination button {
  padding: 8px 17px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}
.pagination button:hover:not(:disabled) {
  background: #f1f5f9;
}
.pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.page-summary {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #64748b;
  font-size: 14px;
}
@media (max-width: 650px) {
  .page-heading h1 {
    font-size: 25px;
  }
  .search-box,
  .page-size {
    flex: 1 1 100%;
    width: 100%;
  }
  .page-size {
    margin-inline-start: 0;
  }
  .pagination {
    gap: 8px;
  }
  .pagination button {
    padding: 8px 11px;
  }
}

/* Shared table presentation: physical left/search, middle/page size, right/action in both languages. */
.ui-table-toolbar {
  direction: ltr !important;
  display: grid !important;
  grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr) !important;
  align-items: center !important;
  column-gap: 16px !important;
  row-gap: 10px !important;
  justify-content: stretch !important;
  width: 100% !important;
  margin-bottom: 16px !important;
}
.ui-table-toolbar > input:first-child,
.ui-table-toolbar > .search:first-child,
.ui-table-toolbar > .search-box:first-child {
  grid-column: 1;
  grid-row: 1;
  justify-self: start !important;
  min-width: 0;
  max-width: 360px;
  width: 100%;
}
.ui-table-toolbar > select,
.ui-table-toolbar > .per-page,
.ui-table-toolbar > .toolbar-right {
  grid-column: 2;
  grid-row: 1;
  justify-self: center !important;
  margin-inline: auto !important;
}
.ui-table-toolbar > .toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ui-table-toolbar > .toolbar-right .per-page {
  margin: auto;
}
.ui-table-toolbar > .toolbar-right .count {
  font-size: 12px;
  color: #68788b;
}
.ui-table-toolbar > .filters {
  display: contents;
}
.ui-table-toolbar > .filters > input:first-child {
  grid-column: 1;
  grid-row: 1;
  justify-self: start !important;
  max-width: 360px;
  width: 100%;
}
.ui-table-toolbar > .filters > select {
  grid-column: 2;
  grid-row: 1;
  justify-self: center !important;
}
.ui-table-toolbar > .toolbar-right > button,
.ui-table-toolbar > button.primary,
.ui-table-toolbar > .primary,
.ui-table-toolbar > .btn-new {
  grid-column: 3;
  grid-row: 1;
  justify-self: end !important;
}
.ui-table-toolbar > select:not(:first-child) {
  width: auto;
  min-width: 105px;
}
.ui-table-toolbar > input[type='search'],
.ui-table-toolbar > input:not([type]),
.ui-table-toolbar .search-box input {
  height: 34px !important;
  min-height: 34px !important;
  box-sizing: border-box;
}
.ui-table-toolbar > select {
  height: 34px !important;
  min-height: 34px !important;
  box-sizing: border-box;
}
.ui-table-toolbar
  > :not(input):not(select):not(.per-page):not(.toolbar-right):not(.search-box):not(.filters):not(
    button
  ) {
  justify-self: center;
}
.ui-table-toolbar > input:only-child {
  grid-column: 1;
}
.ui-table-toolbar > input:nth-child(1) {
  grid-column: 1;
}
.ui-table-toolbar > select:nth-child(2) {
  grid-column: 2;
}
.ui-table-toolbar > select:nth-child(3) {
  grid-column: 2;
}
.ui-table-toolbar > button:last-child {
  grid-column: 3;
  justify-self: end;
}
.ui-legacy-pager {
  display: none !important;
}
/* Keep the physical toolbar arrangement LTR, but type Arabic search terms naturally. */
:global(html[dir='rtl']) .ui-table-toolbar input {
  direction: rtl;
}
/* Center table values independent of dir=auto/ltr on individual cells. */
.ui-standardized-table th,
.ui-standardized-table td {
  text-align: center !important;
  vertical-align: middle !important;
}
.ui-standardized-table td[dir],
.ui-standardized-table th[dir] {
  text-align: center !important;
}
.ui-standardized-table td .actions,
.ui-standardized-table td .action-group,
.ui-standardized-table td .row-actions {
  justify-content: center !important;
}
.ui-standardized-table td input,
.ui-standardized-table td textarea {
  text-align: inherit;
}
@media (max-width: 680px) {
  .ui-table-toolbar {
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 8px !important;
  }
  .ui-table-toolbar > input:first-child,
  .ui-table-toolbar > .search-box:first-child {
    grid-column: 1;
  }
  .ui-table-toolbar > select,
  .ui-table-toolbar > .per-page,
  .ui-table-toolbar > .toolbar-right {
    grid-column: 2;
  }
  .ui-table-toolbar > button.primary,
  .ui-table-toolbar > .primary {
    grid-column: 1/-1;
    grid-row: auto;
    justify-self: end;
  }
}
</style>
