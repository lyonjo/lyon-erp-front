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
  '/rent/login-image': () => import('./views/LoginImagesView.vue'),
  '/rent/branches': () => import('./views/MyBranchesView.vue'),
  '/rent/cars': () => import('./views/VehiclesView.vue'),
  '/rent/vehicles-maintenance': () => import('./views/VehicleMaintenancesView.vue'),
  '/rent/vehicles-sold': () => import('./views/SoldCarsView.vue'),
  '/rent/drivers': () => import('./views/DriversView.vue'),
  '/rent/suppliers': () => import('./views/SuppliersView.vue'),
  '/rent/external-vehicle': () => import('./views/ExternalVehiclesView.vue'),
  '/rent/car-rental-price': () => import('./views/CarRentalPricesView.vue'),
  '/rent/car-rental-price-company': () => import('./views/CompanyCarRentalPricesView.vue'),
  '/rent/settings': () => import('./views/RentSettingsView.vue'),
  '/rent/extra-items': () => import('./views/ExtraItemsView.vue'),
  '/rent/booking': () => import('./views/BookingsView.vue'),
  '/rent/car-rentered': () => import('./views/ReservationCarsView.vue'),
  '/rent/available-car': () => import('./views/AvailableCarsView.vue'),
  '/rent/cars-expected-back': () => import('./views/CarExpectedBackView.vue'),
  '/rent/contracts/rental': () => import('./views/RentalContractsView.vue'),
  '/rent/terms-and-conditions': () => import('./views/RentTermsAndConditionsView.vue'),
  '/rent/payments': () => import('./views/PaymentsView.vue'),
  '/rent/traffic-violations': () => import('./views/TrafficViolationsView.vue'),
  '/rent/lawsuits': () => import('./views/LawsuitsView.vue'),
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
  {
    path: 'cars/create',
    component: () => import('./views/VehicleFormView.vue'),
    meta: { title: 'New Vehicle' },
  },
  {
    path: 'cars/:id/edit',
    component: () => import('./views/VehicleFormView.vue'),
    meta: { title: 'Edit Vehicle' },
  },
  {
    path: 'cars/:id',
    component: () => import('./views/VehicleFormView.vue'),
    meta: { title: 'Vehicle Details' },
  },
  {
    path: 'vehicles-maintenance/create',
    component: () => import('./views/VehicleMaintenanceFormView.vue'),
    meta: { title: 'Add Vehicles Maintenance' },
  },
  {
    path: 'vehicles-maintenance/:id/edit',
    component: () => import('./views/VehicleMaintenanceFormView.vue'),
    meta: { title: 'Edit Vehicles Maintenance' },
  },
  {
    path: 'vehicles-maintenance/:id',
    component: () => import('./views/VehicleMaintenanceShowView.vue'),
    meta: { title: 'Vehicles Maintenance Details' },
  },
  {
    path: 'vehicles-sold/create',
    component: () => import('./views/SoldCarsFormView.vue'),
    meta: { title: 'Add Sold Car' },
  },
  {
    path: 'vehicles-sold/:id/edit',
    component: () => import('./views/SoldCarsFormView.vue'),
    meta: { title: 'Edit Sold Car' },
  },
  {
    path: 'vehicles-sold/:id',
    component: () => import('./views/SoldCarsShowView.vue'),
    meta: { title: 'Sold Car Details' },
  },
  {
    path: 'drivers/create',
    component: () => import('./views/DriverFormView.vue'),
    meta: { title: 'New Driver' },
  },
  {
    path: 'drivers/:id/edit',
    component: () => import('./views/DriverFormView.vue'),
    meta: { title: 'Edit Driver' },
  },
  {
    path: 'drivers/:id',
    component: () => import('./views/DriverShowView.vue'),
    meta: { title: 'Driver Details' },
  },
  {
    path: 'external-vehicle/create',
    component: () => import('./views/ExternalVehicleFormView.vue'),
    meta: { title: 'New External Vehicle' },
  },
  {
    path: 'external-vehicle/:id/edit',
    component: () => import('./views/ExternalVehicleFormView.vue'),
    meta: { title: 'Edit External Vehicle' },
  },
  {
    path: 'external-vehicle/:id',
    component: () => import('./views/ExternalVehicleFormView.vue'),
    meta: { title: 'External Vehicle Details' },
  },
  {
    path: 'car-rental-price/create',
    component: () => import('./views/CarRentalPriceFormView.vue'),
    meta: { title: 'Add Car Rental Price' },
  },
  {
    path: 'car-rental-price/:id/edit',
    component: () => import('./views/CarRentalPriceFormView.vue'),
    meta: { title: 'Edit Car Rental Price' },
  },
  {
    path: 'car-rental-price/:id',
    component: () => import('./views/CarRentalPriceFormView.vue'),
    meta: { title: 'View Car Rental Price' },
  },
  {
    path: 'car-rental-price-company/edit',
    component: () => import('./views/CompanyCarRentalPriceFormView.vue'),
    meta: { title: 'Edit Company Rental Price' },
  },
  { path: 'booking/create', component: () => import('./views/BookingRentCreateView.vue') },
  {
    path: 'booking/:id/relay',
    component: () => import('./views/BookingRelayView.vue'),
    meta: { title: 'Relay Booking' },
  },
  { path: 'booking/:id', component: () => import('./views/BookingRentShowView.vue') },
  { path: 'car-rentered/:id', component: () => import('./views/ReservationCarDetailsView.vue') },
  {
    path: 'contracts/rental/:id/edit',
    component: () => import('./views/RentalContractFormView.vue'),
  },
  {
    path: 'contracts/rental/:id/view',
    component: () => import('./views/RentalContractFormView.vue'),
  },
  {
    path: 'contracts/rental/:id/invoice',
    component: () => import('./views/RentalContractInvoiceView.vue'),
  },
  {
    path: 'contracts/rental/:id/video',
    component: () => import('./views/RentalContractVideoView.vue'),
  },
  {
    path: 'payments/new',
    component: () => import('./views/PaymentNewView.vue'),
    meta: { title: 'New Payment' },
  },
  {
    path: 'payments/:id/edit',
    component: () => import('./views/PaymentEditView.vue'),
    meta: { title: 'Edit Payment' },
  },
  {
    path: 'traffic-violations/create',
    component: () => import('./views/TrafficViolationFormView.vue'),
  },
  {
    path: 'traffic-violations/:id/view',
    component: () => import('./views/TrafficViolationFormView.vue'),
  },
  {
    path: 'traffic-violations/:id/edit',
    component: () => import('./views/TrafficViolationFormView.vue'),
  },
  { path: 'lawsuits/create', component: () => import('./views/LawsuitFormView.vue') },
  { path: 'lawsuits/:id/edit', component: () => import('./views/LawsuitFormView.vue') },
  { path: 'lawsuits/:id/view', component: () => import('./views/LawsuitFormView.vue') },
]

export default {
  path: '/rent',
  component: () => import('./RentLayout.vue'),
  meta: { auth: true, module: 'rent' },
  children,
}
