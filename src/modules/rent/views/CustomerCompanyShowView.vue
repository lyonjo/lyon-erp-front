<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCustomerCompany } from '@/composables/useCustomerCompany'

const router = useRouter()
const route = useRoute()
const { company, loading, fetchCustomerCompany } = useCustomerCompany()

onMounted(() => fetchCustomerCompany(route.params.id))

const edit = () => router.push(`/rent/customer-companies/${route.params.id}/edit`)
const back = () => router.push('/rent/customer-companies')
</script>

<template>
  <div class="page">
    <div class="topbar">
      <button class="back" type="button" @click="back">← Companies</button>
      <button class="btn-edit" type="button" @click="edit">Edit</button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="company" class="card">
      <h1 class="title">{{ company.name }}</h1>

      <div class="grid">
        <div class="field">
          <label>Email</label>
          <p>{{ company.email || '—' }}</p>
        </div>
        <div class="field">
          <label>Phone</label>
          <p>{{ company.country_code }} {{ company.phone }}</p>
        </div>
        <div class="field full">
          <label>Address</label>
          <p>{{ company.address || '—' }}</p>
        </div>
        <div class="field">
          <label>Multi Contract</label>
          <p>
            <span class="badge" :class="company.is_multi_contract ? 'good' : 'bad'">
              {{ company.is_multi_contract ? 'Yes' : 'No' }}
            </span>
          </p>
        </div>
        <div class="field">
          <label>Black List</label>
          <p>
            <span class="badge" :class="company.is_blacklist ? 'bad' : 'good'">
              {{ company.is_blacklist ? 'Yes' : 'No' }}
            </span>
          </p>
        </div>
      </div>
    </div>
    <div v-else class="error">Failed to load company</div>
  </div>
</template>

<style scoped>
.page {
  padding: 8px 4px 40px;
  color: #1f2937;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.back {
  background: none;
  border: 0;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
}
.back:hover {
  color: #1f2937;
}
.btn-edit {
  height: 34px;
  padding: 0 28px;
  border: 0;
  border-radius: 999px;
  background: #4f93b8;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-edit:hover {
  background: #3f83a8;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 28px 24px 40px;
  max-width: 560px;
  margin: 0 auto;
}

.title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 24px;
  color: #1e2433;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.full {
  grid-column: 1 / -1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}
.field p {
  font-size: 15px;
  color: #1f2937;
  margin: 0;
}

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

.loading,
.error {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}
.error {
  color: #dc2626;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
