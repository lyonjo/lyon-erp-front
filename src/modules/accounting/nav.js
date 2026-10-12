export default [
  { label: 'Dashboard', to: '/accounting' },
  { label: 'Payments', to: '/accounting/payments', permission: 'accounting.payments.view' },
  { label: 'Accounting Tree', to: '/accounting/tree', permission: 'accounting.tree.view' },
  { label: 'Reports', to: '/accounting/reports', permission: 'accounting.reports.view' },
]
