<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const rows = ref([]),
  error = ref(''),
  loading = ref(true),
  uploading = ref(false),
  recording = ref(false),
  file = ref(null),
  preview = ref('')
const camera = ref(null),
  recorder = ref(null),
  chunks = ref([]),
  liveVideo = ref(null),
  played = ref(null),
  playedUrl = ref('')
async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/rent/rental-contracts/${route.params.id}/videos`)
    rows.value = data.data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Unable to load videos'
  } finally {
    loading.value = false
  }
}
onMounted(load)
function choose(e) {
  file.value = e.target.files?.[0] || null
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = file.value ? URL.createObjectURL(file.value) : ''
}
async function start() {
  error.value = ''
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      throw new Error('Camera recording is not supported in this browser. Use Upload Video.')
    camera.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (liveVideo.value) {
      liveVideo.value.srcObject = camera.value
      await liveVideo.value.play()
    }
    chunks.value = []
    const type = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : ''
    recorder.value = new MediaRecorder(camera.value, type ? { mimeType: type } : undefined)
    recorder.value.ondataavailable = (e) => {
      if (e.data.size) chunks.value.push(e.data)
    }
    recorder.value.onstop = () => {
      const blob = new Blob(chunks.value, { type: recorder.value.mimeType || 'video/webm' })
      file.value = new File([blob], `contract-${route.params.id}-${Date.now()}.webm`, {
        type: blob.type,
      })
      if (preview.value) URL.revokeObjectURL(preview.value)
      preview.value = URL.createObjectURL(file.value)
      stopTracks()
    }
    recorder.value.start()
    recording.value = true
  } catch (e) {
    error.value = e.message || 'Unable to access camera'
    stopTracks()
  }
}
function stopTracks() {
  camera.value?.getTracks().forEach((track) => track.stop())
  camera.value = null
  if (liveVideo.value) liveVideo.value.srcObject = null
}
function stop() {
  if (recorder.value?.state === 'recording') recorder.value.stop()
  recording.value = false
}
async function upload() {
  if (!file.value || uploading.value) return
  uploading.value = true
  error.value = ''
  try {
    const form = new FormData()
    form.append('video', file.value)
    await api.post(`/rent/rental-contracts/${route.params.id}/videos`, form)
    file.value = null
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = ''
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}
async function watchVideo(id) {
  error.value = ''
  try {
    const { data } = await api.get(`/rent/rental-contracts/${route.params.id}/videos/${id}`, {
      responseType: 'blob',
    })
    if (playedUrl.value) URL.revokeObjectURL(playedUrl.value)
    playedUrl.value = URL.createObjectURL(data)
    played.value = id
  } catch (e) {
    error.value = 'Could not open video'
  }
}
onBeforeUnmount(() => {
  stopTracks()
  if (preview.value) URL.revokeObjectURL(preview.value)
  if (playedUrl.value) URL.revokeObjectURL(playedUrl.value)
})
</script>
<template>
  <section class="video-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <header>
      <h2>{{ t('Contract Videos', 'فيديوهات العقد') }} #{{ route.params.id }}</h2>
      <button @click="router.push('/rent/contracts/rental')">
        {{ t('Back to Contracts', 'العودة للعقود') }}
      </button>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="card">
      <h3>{{ t('Take Video / Upload', 'تصوير أو رفع فيديو') }}</h3>
      <p>
        {{
          t(
            'Camera recording requires HTTPS and camera permission. You can also select an existing MP4 or WEBM file (up to 50 MB).',
            'تتطلب الكاميرا اتصال HTTPS وإذن الوصول، أو يمكنك رفع MP4 / WEBM بحد أقصى 50 ميجابايت.',
          )
        }}
      </p>
      <div class="controls">
        <button v-if="!recording" @click="start">
          {{ t('Start Camera Recording', 'بدء التصوير') }}</button
        ><button v-else @click="stop">{{ t('Stop Recording', 'إيقاف التسجيل') }}</button
        ><label class="upload-label"
          >{{ t('Choose Video File', 'اختيار ملف فيديو')
          }}<input type="file" accept="video/mp4,video/webm,video/quicktime" @change="choose"
        /></label>
      </div>
      <video
        v-show="recording"
        ref="liveVideo"
        autoplay
        muted
        playsinline
        controls
        class="player"
      ></video
      ><video v-if="preview" :src="preview" controls class="player"></video>
      <button class="save" :disabled="!file || uploading" @click="upload">
        {{ uploading ? t('Uploading...', 'جاري الرفع...') : t('Save Video', 'حفظ الفيديو') }}
      </button>
    </div>
    <div class="card">
      <h3>{{ t('Saved Videos', 'الفيديوهات المحفوظة') }}</h3>
      <p v-if="loading">{{ t('Loading...', 'جاري التحميل...') }}</p>
      <p v-else-if="!rows.length">{{ t('No videos uploaded yet.', 'لم يتم رفع فيديوهات بعد.') }}</p>
      <div v-for="v in rows" :key="v.id" class="record">
        <span>{{ v.original_name }} — {{ (v.size_bytes / 1048576).toFixed(1) }} MB</span
        ><button @click="watchVideo(v.id)">{{ t('View Video', 'عرض الفيديو') }}</button>
      </div>
      <video v-if="playedUrl" :src="playedUrl" controls class="player"></video>
    </div>
  </section>
</template>
<style scoped>
.video-page {
  padding: 18px 22px;
  color: #122d4b;
}
.video-page header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}
.video-page h2 {
  font-size: 24px;
}
.card {
  max-width: 850px;
  margin: 20px auto;
  padding: 25px;
  border: 1px solid #dae2ea;
  border-radius: 13px;
}
.card p {
  color: #7689a1;
  font-size: 13px;
}
.controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.controls button,
.save,
.record button,
.video-page header button,
.upload-label {
  border: 1px solid #8fb3d0;
  border-radius: 20px;
  padding: 9px 17px;
  color: #155078;
  background: #eff6fb;
  cursor: pointer;
  font-size: 13px;
}
.upload-label input {
  display: none;
}
.save {
  margin-top: 14px;
  background: #629fc3;
  color: white;
}
.save:disabled {
  opacity: 0.5;
}
.player {
  width: min(100%, 650px);
  max-height: 420px;
  display: block;
  margin-top: 16px;
}
.record {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e3eaf0;
  padding: 10px 0;
}
.error {
  background: #fff1f2;
  color: #b5283b;
  padding: 12px;
}
</style>
