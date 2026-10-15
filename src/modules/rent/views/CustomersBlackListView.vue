<script setup>
import { useBlackList } from '@/composables/useBlackList'

const { rows, meta, search, type, page, perPage, loading, error, fetchBlackList } = useBlackList()

const display = (value) => (value === null || value === undefined || value === '' ? '—' : value)

const fullPhone = (row) => [row.country_code, row.phone].filter(Boolean).join(' ') || '—'

const typeLabel = (value) => (value === 'company' ? 'Company' : 'Customer')
</script>

<template>
  <div class="blacklist-page">
    <h1 class="title">Black List</h1>

    <!-- Filters -->
    <div class="toolbar">
      <div class="search-box">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>

        <input
          v-model="search"
          type="search"
          placeholder="Search"
          aria-label="Search blacklisted records"
        />
      </div>

      <select v-model="type" class="filter-select" aria-label="Filter by type">
        <option value="all">All Types</option>
        <option value="customer">Customers</option>
        <option value="company">Companies</option>
      </select>

      <select v-model.number="perPage" class="per-page" aria-label="Records per page">
        <option :value="10">10 per page</option>
        <option :value="25">25 per page</option>
        <option :value="50">50 per page</option>
        <option :value="100">100 per page</option>
      </select>
    </div>

    <!-- API Error -->
    <div v-if="error" class="api-error" role="alert">
      <span>{{ error }}</span>
      <button type="button" @click="fetchBlackList">Retry</button>
    </div>

    <!-- Table -->
    <div class="table-card" :class="{ loading }">
      <table>
        <thead>
          <tr>
            <th class="left">ID</th>
            <th class="left">Name</th>
            <th>Type</th>
            <th class="left">Email</th>
            <th>Phone</th>
            <th>Black List</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading && !rows.length">
            <td colspan="6" class="empty">Loading...</td>
          </tr>

          <tr v-for="item in rows" :key="`${item.type}-${item.id}`">
            <td class="left">{{ item.id }}</td>

            <td class="left" dir="auto">
              {{ display(item.name) }}
            </td>

            <td>
              <span class="badge type-badge" :class="item.type">
                {{ typeLabel(item.type) }}
              </span>
            </td>

            <td class="left">
              {{ display(item.email) }}
            </td>

            <td dir="auto">
              {{ fullPhone(item) }}
            </td>

            <td>
              <span class="badge bad">Yes</span>
            </td>
          </tr>

          <tr v-if="!loading && !error && !rows.length">
            <td colspan="6" class="empty">No blacklisted records found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <button type="button" :disabled="page <= 1 || loading" @click="page--">Prev</button>

      <span>
        {{ meta.current_page }} /
        {{ meta.last_page }}
        ({{ meta.total }})
      </span>

      <button type="button" :disabled="page >= meta.last_page || loading" @click="page++">
        Next
      </button>
    </div>
  </div>
</template>

<style scoped>
.blacklist-page {
  padding: 8px 4px;
  color: #1f2937;
}

.title {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 28px;
  color: #1e2433;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  width: 300px;
  max-width: 100%;
}

.search-box input {
  width: 100%;
  box-sizing: border-box;
  height: 36px;
  padding: 0 12px 0 36px;
  font-size: 14px;
  border: 2px solid #9ca3af;
  border-radius: 8px;
  outline: none;
  background: #fff;
}

.search-box input:focus {
  border-color: #4f93b8;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}

.filter-select,
.per-page {
  height: 36px;
  padding: 0 12px;
  font-size: 14px;
  color: #6b7280;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.filter-select {
  min-width: 150px;
}

.per-page {
  width: 150px;
  margin-left: auto;
}

/* Table */
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  overflow-x: auto;
  transition: opacity 0.15s;
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
}

th.left,
td.left {
  text-align: left;
}

thead th {
  color: #9ca3af;
  font-weight: 500;
  font-size: 13px;
  border-bottom: 2px solid #e5e7eb;
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

/* Badges */
.badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.badge.bad {
  background: #fee2e2;
  color: #dc2626;
}

.type-badge.customer {
  background: #dbeafe;
  color: #2563eb;
}

.type-badge.company {
  background: #f3e8ff;
  color: #7e22ce;
}

/* States */
.empty {
  text-align: center;
  color: #6b7280;
  padding: 32px;
}

.api-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
}

.api-error button {
  padding: 7px 14px;
  background: #fff;
  border: 1px solid #dc2626;
  border-radius: 6px;
  color: #b91c1c;
  cursor: pointer;
}

/* Pagination */
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
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.pagination button:hover:not(:disabled) {
  background: #f3f4f6;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  font-size: 14px;
  color: #6b7280;
}

@media (max-width: 640px) {
  .toolbar {
    align-items: stretch;
  }

  .search-box,
  .filter-select,
  .per-page {
    width: 100%;
  }

  .per-page {
    margin-left: 0;
  }
}
</style>
