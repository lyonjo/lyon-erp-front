<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerCompanies } from '@/composables/useCustomerCompanies'

const router = useRouter()
const { rows, meta, search, page, perPage, loading, error, fetchCustomerCompanies } =
  useCustomerCompanies()
onMounted(fetchCustomerCompanies)

const view = (c) => router.push(`/rent/customer-companies/${c.id}`)
const edit = (c) => router.push(`/rent/customer-companies/${c.id}/edit`)
const create = () => router.push('/rent/customer-companies/create')
</script>

<template>
  <div class="companies-page">
    <h1 class="title">Manage Companies</h1>

    <!-- Toolbar -->
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
        <input v-model="search" type="search" placeholder="Search" />
      </div>

      <select v-model.number="perPage" class="per-page">
        <option :value="10">10 per page</option>
        <option :value="25">25 per page</option>
        <option :value="50">50 per page</option>
        <option :value="100">100 per page</option>
      </select>

      <button class="btn-new" @click="create">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New Company
      </button>
    </div>
    <div v-if="error" class="api-error" role="alert">
      <span>{{ error }}</span>
      <button type="button" @click="fetchCustomerCompanies">Retry</button>
    </div>
    <!-- Table -->
    <div class="table-card" :class="{ loading }">
      <table>
        <thead>
          <tr>
            <th class="left">ID</th>
            <th class="left">Company Name</th>
            <th class="left">Email</th>
            <th>Phone</th>
            <th>Black List</th>
            <th>Multi Contract</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id">
            <td class="left">{{ c.id }}</td>
            <td class="left" dir="auto">{{ c.name }}</td>
            <td class="left">{{ c.email || '—' }}</td>
            <td>{{ c.phone || '—' }}</td>
            <td>
              <span class="badge" :class="c.is_blacklist ? 'bad' : 'good'">
                {{ c.is_blacklist ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <span class="badge" :class="c.is_multi_contract ? 'good' : 'bad'">
                {{ c.is_multi_contract ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="action" @click="view(c)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z"
                    />
                  </svg>
                  View
                </button>
                <button class="action" @click="edit(c)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                    />
                  </svg>
                  Edit
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !rows.length">
            <td colspan="7" class="empty">No companies found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <button :disabled="page <= 1 || loading" @click="page--">Prev</button>
      <span>{{ meta.current_page }} / {{ meta.last_page }} ({{ meta.total }})</span>
      <button :disabled="page >= meta.last_page || loading" @click="page++">Next</button>
    </div>
  </div>
</template>

<style scoped>
.companies-page {
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
}
.toolbar .per-page {
  margin: 0 auto;
}

.search-box {
  position: relative;
  width: 300px;
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

.per-page {
  height: 36px;
  width: 150px;
  padding: 0 12px;
  font-size: 14px;
  color: #6b7280;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.btn-new {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: #4f93b8;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-new:hover {
  background: #3f83a8;
}

/* Table */
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  transition: opacity 0.15s;
}
.table-card.loading {
  opacity: 0.6;
}

table {
  width: 100%;
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
.empty {
  text-align: center;
  color: #6b7280;
  padding: 32px;
}

/* Badges */
.badge {
  display: inline-block;
  min-width: 36px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}
.badge.good {
  background: #dcfce7;
  color: #16a34a;
}
.badge.bad {
  background: #fee2e2;
  color: #dc2626;
}

/* Actions */
.actions {
  display: flex;
  justify-content: center;
  gap: 14px;
}
.action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font-size: 13px;
  color: #111827;
}
.action:hover {
  color: #4f93b8;
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
.api-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  border: 1px solid #dc2626;
  border-radius: 6px;
  background: white;
  color: #b91c1c;
  cursor: pointer;
}
</style>
