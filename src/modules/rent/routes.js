import groups from './nav'

// Real pages replace the placeholder one by one:
const pages = {
  '/rent': () => import('./views/DashboardView.vue'),
  '/rent/customers': () => import('./views/CustomersView.vue'),
  // '/rent/cars': () => import('./views/VehiclesView.vue'),
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
    meta: { permission: 'rent.customers.manage', title: 'New Customer' },
  },
  {
    path: 'customers/:id',
    component: () => import('./views/CustomerShowView.vue'),
    meta: { permission: 'rent.customers.view', title: 'Customer' },
  },
  {
    path: 'customers/:id/edit',
    component: () => import('./views/CustomerEditView.vue'),
    meta: { permission: 'rent.customers.manage', title: 'Edit Customer' },
  },
]

export default {
  path: '/rent',
  component: () => import('./RentLayout.vue'),
  meta: { auth: true, module: 'rent' },
  children,
}
