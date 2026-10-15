<script setup>
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n({ useScope: 'global' })
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MODULES } from '@/modules/registry'
import ProductIcon from '@/components/ProductIcon.vue'

const props = defineProps({
  title: String,
  groups: { type: Array, default: () => [] },
  module: String,
})

const auth = useAuthStore()
const router = useRouter()
const root = ref(null)

const openGroup = ref(null) // 'dropdown key' | 'profile' | 'products' | null
const menuOpen = ref(false) // mobile sheet
const mobileGroup = ref(null)
let timer = null

const products = computed(() => auth.modules.map((k) => MODULES[k]).filter(Boolean))

const visibleGroups = computed(() =>
  props.groups
    .map((g) => ({
      ...g,
      label: t(`nav.${g.label}`),
      links: g.links
        .filter((l) => !l.permission || auth.can(l.permission))
        .map((l) => ({ ...l, text: t(`nav.${l.text}`) })),
    }))
    .filter((g) => g.links.length),
)

function open(key) {
  clearTimeout(timer)
  openGroup.value = key
}
function toggle(key) {
  clearTimeout(timer)
  openGroup.value = openGroup.value === key ? null : key
}
function scheduleClose(key) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (openGroup.value === key) openGroup.value = null
  }, 200)
}
function closeAll() {
  openGroup.value = null
  menuOpen.value = false
  mobileGroup.value = null
}

function goProduct(p) {
  closeAll()
  router.push(p.path)
}

async function logout() {
  closeAll()
  await auth.logout()
  router.push('/login')
}

function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) closeAll()
}
function onEsc(e) {
  if (e.key === 'Escape') closeAll()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onEsc)
  clearTimeout(timer)
})
</script>

<template>
  <nav ref="root" class="nav">
    <div class="bar">
      <router-link :to="MODULES[module]?.path || '/'" class="brand">{{ title }}</router-link>

      <!-- Desktop -->
      <div class="desktop">
        <div class="pill">
          <ul class="items">
            <li
              v-for="g in visibleGroups"
              :key="g.key"
              class="item"
              @mouseenter="open(g.key)"
              @mouseleave="scheduleClose(g.key)"
            >
              <button
                type="button"
                class="nav-link"
                :aria-expanded="openGroup === g.key"
                @click="toggle(g.key)"
              >
                {{ g.label }}
                <svg
                  class="chev"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <ul
                v-show="openGroup === g.key"
                class="dropdown"
                @mouseenter="open(g.key)"
                @mouseleave="scheduleClose(g.key)"
              >
                <li v-for="l in g.links" :key="l.to">
                  <router-link :to="l.to" class="dropdown-item" @click="closeAll">{{
                    l.text
                  }}</router-link>
                </li>
              </ul>
            </li>
          </ul>
        </div>

        <!-- Product switcher -->
        <div
          v-if="products.length > 1"
          class="item"
          @mouseenter="open('products')"
          @mouseleave="scheduleClose('products')"
        >
          <button
            type="button"
            class="round-pill"
            title="Switch product"
            @click="toggle('products')"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <div
            v-show="openGroup === 'products'"
            class="dropdown products"
            @mouseenter="open('products')"
            @mouseleave="scheduleClose('products')"
          >
            <div class="drop-title">{{ t('nav.Switch product') }}</div>
            <button
              v-for="p in products"
              :key="p.key"
              type="button"
              class="product"
              :class="{ current: p.key === module }"
              @click="goProduct(p)"
            >
              <span class="icon"><ProductIcon :name="p.key" :size="20" /></span>
              <span>{{ p.name }}</span>
              <span v-if="p.key === module" class="dot"></span>
            </button>
          </div>
        </div>

        <!-- Language selector: aligned with the navigation actions -->
        <div class="language-desktop">
          <LanguageSwitcher />
        </div>

        <!-- Profile -->
        <div class="item" @mouseenter="open('profile')" @mouseleave="scheduleClose('profile')">
          <button type="button" class="round-pill wide" @click="toggle('profile')">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.51 4.51 0 0 0 12 12Z" />
              <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
            </svg>
            <svg
              class="chev"
              :class="{ flip: openGroup === 'profile' }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div
            v-show="openGroup === 'profile'"
            class="dropdown profile"
            @mouseenter="open('profile')"
            @mouseleave="scheduleClose('profile')"
          >
            <div class="user">{{ auth.user?.name || 'User' }}</div>
            <button type="button" class="menu-row" @click="logout">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M15 12H3" />
                <path d="M11 8l-4 4 4 4" />
                <path d="M15 4h5v16h-5" />
              </svg>
              {{ t('nav.Log Out') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Language stays next to the menu button on smaller screens -->
      <div class="language-mobile">
        <LanguageSwitcher />
      </div>
      <!-- Hamburger (small screens) -->
      <button
        type="button"
        class="burger"
        aria-label="Toggle navigation"
        @click="menuOpen = !menuOpen"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    </div>

    <!-- Mobile sheet -->
    <div v-if="menuOpen" class="sheet">
      <div v-if="products.length > 1" class="m-products">
        <button
          v-for="p in products"
          :key="p.key"
          type="button"
          class="chip"
          :class="{ current: p.key === module }"
          @click="goProduct(p)"
        >
          <ProductIcon :name="p.key" :size="16" /> {{ p.name }}
        </button>
      </div>

      <div v-for="g in visibleGroups" :key="g.key" class="m-group">
        <button
          type="button"
          class="m-head"
          @click="mobileGroup = mobileGroup === g.key ? null : g.key"
        >
          <span>{{ g.label }}</span>
          <svg
            class="chev"
            :class="{ flip: mobileGroup === g.key }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <div v-if="mobileGroup === g.key" class="m-links">
          <router-link
            v-for="l in g.links"
            :key="l.to"
            :to="l.to"
            class="m-link"
            @click="closeAll"
            >{{ l.text }}</router-link
          >
        </div>
      </div>

      <button type="button" class="m-logout" @click="logout">{{ t('nav.Logout') }}</button>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  position: relative;
  z-index: 1000;
  background: #fff;
  padding: 16px;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.brand {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.language-desktop {
  --language-height: 56px;
  flex: none;
}
.language-mobile {
  --language-height: 40px;
  margin-inline-start: auto;
}
@media (min-width: 1024px) {
  .language-mobile {
    display: none;
  }
}
.desktop {
  display: none;
  align-items: center;
  gap: 12px;
}

.pill {
  height: 56px;
  border-radius: 23px;
  box-shadow:
    0 0 0 1px #c9d5df,
    0 1px 2px rgba(0, 0, 0, 0.05);
  background: linear-gradient(to bottom, #d9e8f2, #c3d2de);
  display: flex;
  align-items: center;
}
.items {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  margin: 0;
  list-style: none;
}
.item {
  position: relative;
  list-style: none;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  background: none;
  border: 0;
  padding: 0;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
  white-space: nowrap;
}
.nav-link:hover {
  color: #111827;
}
.chev {
  width: 16px;
  height: 16px;
  margin-left: 4px;
  transition: transform 0.15s;
}
.chev.flip {
  transform: rotate(180deg);
}

.round-pill {
  height: 56px;
  min-width: 56px;
  padding: 0 14px;
  border: 0;
  border-radius: 23px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #1f2937;
  cursor: pointer;
  box-shadow:
    0 0 0 1px #c9d5df,
    0 1px 2px rgba(0, 0, 0, 0.05);
  background: linear-gradient(to bottom, #d9e8f2, #c3d2de);
}
.round-pill.wide {
  padding: 0 16px;
}
.round-pill:hover {
  filter: brightness(1.03);
}

.dropdown {
  position: absolute;
  left: 0;
  top: 100%;
  margin-top: 8px;
  min-width: 190px;
  padding: 8px;
  border-radius: 12px;
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.12),
    0 0 0 1px #f1f5f9;
  background: linear-gradient(to top, #dee0e3 0%, #f9fafb 60%, #fff 100%);
  z-index: 1100;
  list-style: none;
  margin-left: 0;
}
.dropdown.products,
.dropdown.profile {
  left: auto;
  right: 0;
}
.dropdown.profile {
  min-width: 150px;
  text-align: center;
}

.dropdown-item {
  display: block;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s;
}
.dropdown-item:hover,
.menu-row:hover,
.product:hover {
  background: #709ebd;
  color: #fff;
}
.dropdown-item.router-link-exact-active {
  font-weight: 600;
}

.user {
  padding: 4px 8px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.menu-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 8px;
  border: 0;
  border-radius: 6px;
  background: none;
  font-size: 14px;
  color: #111827;
  cursor: pointer;
}

.drop-title {
  padding: 4px 10px 8px;
  font-size: 12px;
  color: #6b7280;
}
.product {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
  background: none;
  font-size: 14px;
  color: #1f2937;
  cursor: pointer;
  text-align: left;
}
.product .icon {
  display: inline-flex;
  color: #3b7099;
}
.product:hover .icon {
  color: #fff;
}
.product.current {
  background: rgba(112, 158, 189, 0.18);
  font-weight: 600;
}
.product.current:hover {
  background: #709ebd;
}
.dot {
  margin-left: auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82a8;
}

/* Hamburger + mobile sheet */
.burger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: none;
  cursor: pointer;
}
.sheet {
  margin-top: 12px;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(to bottom, #d9e8f2, #c3d2de);
  box-shadow: 0 0 0 1px #c9d5df;
  display: grid;
  gap: 8px;
}
.m-products {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  padding: 6px 12px;
  border: 1px solid #c9d5df;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  cursor: pointer;
}
.chip.current {
  background: #709ebd;
  color: #fff;
  border-color: #709ebd;
}
.m-group {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
}
.m-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 0;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
}
.m-links {
  display: grid;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid #e2e8f0;
}
.m-link {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 0 1px #e2e8f0;
  font-size: 13px;
  color: #111827;
  text-decoration: none;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.m-logout {
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

@media (min-width: 1024px) {
  .desktop {
    display: flex;
  }
  .burger,
  .sheet {
    display: none;
  }
}

/* shrink slightly between 1024 and 1280, like the old navbar */
@media (min-width: 1024px) and (max-width: 1280px) {
  .language-desktop {
    --language-height: 48px;
  }
  .pill,
  .round-pill {
    height: 48px;
    border-radius: 20px;
  }
  .items {
    gap: 10px;
    padding: 0 16px;
  }
  .nav-link {
    font-size: 13px;
  }
}
</style>
