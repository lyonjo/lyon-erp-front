<script setup>
import {ref,onMounted} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import api from '@/api'
const route=useRoute(),router=useRouter(),{locale}=useI18n()
const tr=(en,ar)=>locale.value==='ar'?ar:en
const record=ref(null),loading=ref(true),error=ref('')
async function load(){loading.value=true;error.value='';try{const {data}=await api.get(`/rent/bookings/${route.params.id}`);record.value=data.data}catch(e){error.value=e.response?.data?.message||tr('Unable to load booking.','تعذر تحميل الحجز.')}finally{loading.value=false}}
onMounted(load)
const fields=[['ID','id'],['Status','status'],['Service','service'],['Start Date','start_date'],['Start Time','start_time'],['End Date','end_date'],['End Time','end_time'],['Pick Up Location','pick_up_location'],['Return Location','return_location'],['Total Days','total_days'],['Day Price','day_price'],['Company Day Price','day_company_price'],['Extra Charge','extra_charge'],['Extra Company Charge','extra_company_charge'],['Tax','tax'],['Branch Fee','branch_fee'],['Currency','currency'],['Payment Method','payment_method'],['Total','total'],['Company Total','company_total']]
</script>
<template><section class="show" :dir="locale==='ar'?'rtl':'ltr'"><header><h2>{{tr('Booking Details','تفاصيل الحجز')}} #{{route.params.id}}</h2><button @click="router.push('/rent/booking')">{{tr('Back','رجوع')}}</button></header><div v-if="loading" class="state">{{tr('Loading...','جاري التحميل...')}}</div><div v-else-if="error" class="state">{{error}} <button @click="load">{{tr('Retry','إعادة المحاولة')}}</button></div><div v-else-if="record" class="card"><div class="grid"><div v-for="[label,key] in fields" :key="key"><small>{{label}}</small><strong>{{record[key]??'—'}}</strong></div><div><small>{{tr('Vehicle','السيارة')}}</small><strong>{{record.car?.number}} — {{record.car?.brand?.name}} {{record.car?.model?.name}}</strong></div><div><small>{{tr('Extra Items','الإضافات')}}</small><strong>{{(record.extra_items||[]).map(x=>x.name).join(', ')||'—'}}</strong></div></div></div></section></template>
<style scoped>.show{padding:20px;color:#102846}header{display:flex;justify-content:space-between;align-items:center}header button{background:white;border:1px solid #d9e1ea;padding:9px 20px;border-radius:20px;cursor:pointer}.card{border:1px solid #dae2ea;border-radius:15px;padding:23px;background:white;margin-top:20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:23px}.grid>div{display:grid;gap:7px}.grid small{color:#8193aa}.grid strong{font-size:14px}.state{padding:50px;text-align:center}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style>
