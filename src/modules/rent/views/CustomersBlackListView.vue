<script setup>
// Compact numbered pagination, with ellipses for large result sets.
function visiblePages(current, last) {
  const total = Math.max(1, Number(last) || 1)
  const currentPage = Math.min(total, Math.max(1, Number(current) || 1))
  const pages = new Set([1, total])
  for (let n = Math.max(1, currentPage - 1); n <= Math.min(total, currentPage + 1); n++)
    pages.add(n)
  const result = []
  for (const n of [...pages].sort((a, b) => a - b)) {
    if (result.length && n - result[result.length - 1] > 1) result.push('…')
    result.push(n)
  }
  return result
}

import { useI18n } from 'vue-i18n'
import { useBlackList } from '@/composables/useBlackList'
const { t, te } = useI18n()
const tr = (v) => (te(`rentUi.${v}`) ? t(`rentUi.${v}`) : v)
const { rows, meta, search, type, page, perPage, loading, error, fetchBlackList } = useBlackList()
perPage.value = 50
const phone = (v) => [v.country_code, v.phone].filter(Boolean).join(' ') || '—'
</script>
<template>
  <div class="page">
    <h1 class="title">{{ tr('Black List') }}</h1>
    <div class="toolbar">
      <div class="search-box">
        <input
          v-model="search"
          type="search"
          :placeholder="tr('Search')"
          :aria-label="tr('Search')"
        />
      </div>
      <select v-model="type" class="selector type-filter">
        <option value="all">{{ tr('All Types') }}</option>
        <option value="customer">{{ tr('Customers') }}</option>
        <option value="company">{{ tr('Companies') }}</option>
      </select>
      <select v-model.number="perPage" class="selector per-page">
        <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">
          {{ n }} {{ tr('per page') }}
        </option>
      </select>
    </div>
    <div v-if="error" class="api-error" role="alert">
      {{ error }}<button @click="fetchBlackList">{{ tr('Retry') }}</button>
    </div>
    <div class="table-card" :class="{ loading }">
      <table>
        <thead>
          <tr>
            <th>{{ tr('ID') }}</th>
            <th>{{ tr('Name') }}</th>
            <th>{{ tr('Type') }}</th>
            <th>{{ tr('Email') }}</th>
            <th>{{ tr('Phone') }}</th>
            <th>{{ tr('Note') }}</th>
            <th>{{ tr('Black List') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rows" :key="`${item.type}-${item.id}`">
            <td>{{ item.id }}</td>
            <td dir="auto">{{ item.name || '—' }}</td>
            <td>
              <span class="badge" :class="item.type">{{
                tr(item.type === 'company' ? 'Company' : 'Customer')
              }}</span>
            </td>
            <td dir="auto">{{ item.email || '—' }}</td>
            <td dir="ltr">{{ phone(item) }}</td>
            <td dir="auto">{{ item.note || '—' }}</td>
            <td>
              <span class="badge bad">{{ tr('Yes') }}</span>
            </td>
          </tr>
          <tr v-if="!loading && !error && !rows.length">
            <td colspan="7" class="empty">{{ tr('No blacklisted records found') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <button
        class="page-arrow"
        :disabled="loading || page <= 1"
        @click="page--"
        aria-label="Previous page"
      >
        ‹
      </button>
      <template v-for="(p, i) in visiblePages(page, meta.last_page)" :key="`${p}-${i}`">
        <span v-if="p === '…'" class="page-ellipsis">…</span>
        <button
          v-else
          class="page-number"
          :class="{ active: p === page }"
          :aria-current="p === page ? 'page' : undefined"
          :disabled="loading"
          @click="page = p"
        >
          {{ p }}
        </button>
      </template>
      <button
        class="page-arrow"
        :disabled="loading || page >= (meta.last_page || 1)"
        @click="page++"
        aria-label="Next page"
      >
        ›
      </button>
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

/* Consistent Customer-section table layout; independent of page direction. */
.toolbar {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 14px;
  direction: ltr;
}
.toolbar .search-box,
.toolbar > input {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
}
.toolbar .per-page,
.toolbar > select {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  margin: 0 !important;
}
.toolbar .btn-new,
.toolbar .primary {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}
.toolbar .type-filter {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}
.table-card th,
.table-card td,
.table-wrap th,
.table-wrap td,
.table-box th,
.table-box td {
  text-align: center !important;
}
.table-card td[dir='auto'],
.table-card td[dir='ltr'],
.table-wrap td[dir],
.table-box td[dir] {
  text-align: center !important;
}
.pagination {
  display: flex !important;
  direction: ltr;
  align-items: center;
  justify-content: center !important;
  gap: 7px !important;
  padding: 16px 0 !important;
  flex-wrap: wrap;
}
.pagination .page-number {
  width: 35px;
  height: 35px;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 50% !important;
  background: #f1f3f6;
  color: #142d4f;
  cursor: pointer;
}
.pagination .page-number.active {
  background: #3b82f6 !important;
  color: white !important;
}
.pagination .page-ellipsis {
  padding: 0 5px;
  color: #6b7280;
}
.pagination .page-arrow {
  border: 0 !important;
  background: transparent !important;
  padding: 6px 10px !important;
  cursor: pointer;
}
@media (max-width: 640px) {
  .toolbar {
    grid-template-columns: minmax(0, 1fr) auto !important;
    row-gap: 10px;
  }
  .toolbar .search-box,
  .toolbar > input {
    width: 100%;
    min-width: 0;
    grid-column: 1 / -1;
    grid-row: 1;
  }
  .toolbar .per-page,
  .toolbar > select {
    grid-column: 1;
    grid-row: 2;
    justify-self: start;
  }
  .toolbar .btn-new,
  .toolbar .primary,
  .toolbar .type-filter {
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
  }
}
</style>
