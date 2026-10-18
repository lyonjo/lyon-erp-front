import groups from './nav'

// Add each implemented page here; unimplemented links use PagePlaceholder.
const pages = {
  '/rent': () => import('./views/DashboardView.vue'),
  '/rent/customers': () => import('./views/CustomersView.vue'),
  '/rent/customer-companies': () => import('./views/CustomerCompaniesView.vue'),
  '/rent/customers-black-list': () => import('./views/CustomersBlackListView.vue'),
  '/rent/companies': () => import('./views/MyCompaniesView.vue'),
  '/rent/admin-logs': () => import('./views/AdminLogsView.vue'),
  '/rent/banks': () => import('./views/BanksView.vue'),
}

const children = [
  ...groups
    .flatMap((g) => g.links)
    .map((l) => ({
      path: l.to.replace('/rent', '').replace(/^\//, ''),
      component: pages[l.to] ?? (() => import('@/components/PagePlaceholder.vue')),
      meta: { permission: l.permission, title: l.text },
    })),
  {
    path: 'customers/create',
    component: () => import('./views/CustomerCreateView.vue'),
    meta: { title: 'New Customer' },
  },
  {
    path: 'customers/:id',
    component: () => import('./views/CustomerShowView.vue'),
    meta: { title: 'Customer' },
  },
  {
    path: 'customers/:id/edit',
    component: () => import('./views/CustomerEditView.vue'),
    meta: { title: 'Edit Customer' },
  },
  {
    path: 'customer-companies/create',
    component: () => import('./views/CustomerCompanyCreateView.vue'),
    meta: { title: 'New Company' },
  },
  {
    path: 'customer-companies/:id',
    component: () => import('./views/CustomerCompanyShowView.vue'),
    meta: { title: 'Company' },
  },
  {
    path: 'customer-companies/:id/edit',
    component: () => import('./views/CustomerCompanyEditView.vue'),
    meta: { title: 'Edit Company' },
  },
]

export default {
  path: '/rent',
  component: () => import('./RentLayout.vue'),
  meta: { auth: true, module: 'rent' },
  children,
}
