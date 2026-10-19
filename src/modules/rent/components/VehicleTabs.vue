<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const props=defineProps({ active:{type:String,required:true} })
const { locale }=useI18n()
const ar=computed(()=>locale.value==='ar')
const tabs=computed(()=>[
 {id:'vehicles',en:'Vehicles',ar:'المركبات'}, {id:'brands',en:'Vehicle Brands',ar:'ماركات المركبات'},
 {id:'models',en:'Vehicle Models',ar:'موديلات المركبات'}, {id:'features',en:'Extra Features',ar:'الميزات الإضافية'},
])
</script>
<template><nav class="vehicle-tabs" aria-label="Vehicle management sections">
  <RouterLink v-for="tab in tabs" :key="tab.id" :to="tab.id==='vehicles'?'/rent/cars':`/rent/cars?tab=${tab.id}`" :class="{active:active===tab.id}">{{ ar?tab.ar:tab.en }}</RouterLink>
</nav></template>
<style scoped>
.vehicle-tabs{display:flex;justify-content:center;gap:48px;flex-wrap:wrap;padding:30px 12px 35px}.vehicle-tabs a{color:#99a3b7;text-decoration:none;font-weight:700;font-size:16px;white-space:nowrap}.vehicle-tabs a.active{color:#101e34}.vehicle-tabs a:hover{color:#5d9cc7}@media(max-width:700px){.vehicle-tabs{gap:15px;padding:18px 0}.vehicle-tabs a{font-size:13px}}
</style>
