<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import CustomerForm from '../components/CustomerForm.vue'

const router = useRouter()
const saving = ref(false)
const errors = ref({})
const banner = ref('')

async function save(fd) {
  saving.value = true
  errors.value = {}
  banner.value = ''
  try {
    await api.post('/rent/customers', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    router.push('/rent/customers')
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = e.response.data.errors ?? {}
      banner.value = 'Please fix the highlighted fields.'
    } else {
      banner.value = e.response?.data?.message || 'Something went wrong. Please try again.'
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <CustomerForm mode="create" :saving="saving" :errors="errors" :banner="banner" @submit="save" />
</template>
