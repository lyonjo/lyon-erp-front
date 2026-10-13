<script setup>
import { onMounted } from 'vue'
import { useCustomers } from '@/composables/useCustomers'

const { rows, meta, search, page, loading, fetchCustomers } = useCustomers()
onMounted(fetchCustomers)
</script>

<template>
  <div class="customers-page">
    <h2>Customers</h2>
    
    <input v-model="search" type="search" placeholder="Search name, phone or email" class="search-input" />

    <table :class="{ 'opacity-60': loading }" class="customers-table">
      <thead>
        <tr>
          <th>#</th><th>Name</th><th>Blacklisted</th><th>Multi contract</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in rows" :key="c.id">
          <td>{{ c.id }}</td>
          <td>{{ c.name }}</td>
          <td>{{ c.is_blacklist ? 'Yes' : 'No' }}</td>
          <td>{{ c.is_multi_contract ? 'Yes' : 'No' }}</td>
        </tr>
        <tr v-if="!loading && !rows.length"><td colspan="4">No customers found</td></tr>
      </tbody>
    </table>

    <div class="pagination">
      <button :disabled="page <= 1 || loading" @click="page--">Prev</button>
      <span>{{ meta.current_page }} / {{ meta.last_page }} ({{ meta.total }})</span>
      <button :disabled="page >= meta.last_page || loading" @click="page++">Next</button>
    </div>
  </div>
</template>

<style scoped>
.customers-page {
  max-width: 1200px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  max-width: 400px;
  padding: 10px 15px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.customers-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.customers-table th,
.customers-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.customers-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.customers-table tbody tr:hover {
  background: #f8f9fa;
}

.customers-table.opacity-60 {
  opacity: 0.6;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.pagination button:hover:not(:disabled) {
  background: #f0f0f0;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  font-size: 14px;
  color: #666;
}
</style> 
