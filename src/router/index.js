import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MODULES } from '@/modules/registry'
import rentRoutes from '@/modules/rent/routes'
import accountingRoutes from '@/modules/accounting/routes'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
    { path: '/', component: () => import('@/views/LauncherView.vue'), meta: { auth: true } },
    rentRoutes,
    accountingRoutes,
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.guest) return auth.token ? '/' : true
  if (!auth.token) return '/login'

  if (!auth.user) await auth.fetchUser() // after a page refresh

  // a single product skips the launcher
  if (to.path === '/' && auth.modules.length === 1) return MODULES[auth.modules[0]].path

  const module = to.matched.find((r) => r.meta.module)?.meta.module
  if (module && !auth.hasModule(module)) {
    console.warn('[router] module not owned:', module)
    return '/'
  }

  const permission = to.matched.map((r) => r.meta.permission).find(Boolean)
  if (permission && !auth.can(permission)) {
    console.warn('[router] missing permission:', permission, 'for', to.path)

    // inside a product, send the user to the first page they are allowed to open
    if (module) {
      const first = to.matched[0].children?.find(
        (c) => !c.meta?.permission || auth.can(c.meta.permission),
      )
      if (first) {
        const target = `${to.matched[0].path}/${first.path}`.replace(/\/$/, '')
        if (target !== to.path) return target
      }
    }
    return '/'
  }
})

export default router
