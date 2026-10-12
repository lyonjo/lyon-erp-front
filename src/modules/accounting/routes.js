export default {
  path: '/accounting',
  component: () => import('./AccountingLayout.vue'),
  meta: { auth: true, module: 'accounting' },
  children: [
    { path: '', component: () => import('./views/DashboardView.vue') },
    {
      path: 'payments',
      component: () => import('./views/PaymentsView.vue'),
      meta: { permission: 'accounting.payments.view' },
    },
    {
      path: 'tree',
      component: () => import('./views/TreeView.vue'),
      meta: { permission: 'accounting.tree.view' },
    },
    {
      path: 'reports',
      component: () => import('./views/ReportsView.vue'),
      meta: { permission: 'accounting.reports.view' },
    },
  ],
}
