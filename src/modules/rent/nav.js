const link = (to, text, resource) => ({
  to: `/rent${to}`,
  text,
  permission: `rent.${resource}.view`,
})

export default [
  {
    key: 'dashboard',
    label: 'Dashboard',
    links: [
      link('', 'Dashboard', 'dashboard'),
      link('/cars-expected-back', 'Car Expected Back', 'expected_back'),
      link('/available-car', 'Available Car', 'available_cars'),
      link('/car-rentered', 'Reservation Cars', 'reservation_cars'),
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    links: [
      { to: '/rent/customers', text: 'Customers', permission: null },
      { to: '/rent/customer-companies', text: 'Companies', permission: null },
      { to: '/rent/customers-black-list', text: 'Black List', permission: null },
      { to: '/rent/car-rental-price', text: 'Car Rental Price Customer', permission: null },
      { to: '/rent/car-rental-price-company', text: 'Car Rental Price Company', permission: null },
    ],
  },
  {
    key: 'contracts',
    label: 'Contracts',
    links: [
      link('/contracts/rental', 'Car Rental Contracts', 'contracts'),
      link('/contracts/transportation', 'Transportation Contracts', 'transportation'),
    ],
  },
  {
    key: 'financial',
    label: 'Financial',
    links: [
      link('/payments', 'Payments', 'payments'),
      { to: '/rent/banks', text: 'banks', permission: null },
      link('/traffic-violations', 'Traffic Violations', 'traffic_violations'),
      link('/extra-money', 'Extra Money', 'extra_money'),
      link('/refunds', 'Refund', 'refunds'),
      link('/discounts', 'Discount', 'discounts'),
      link('/gasoline', 'Gasoline', 'gasoline'),
    ],
  },
  {
    key: 'reservation',
    label: 'Reservation',
    links: [
      link('/booking', 'Bookings', 'bookings'),
      link('/bookings/manifest', 'Mani Vest', 'manifest'),
    ],
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    links: [
      link('/cars', 'Vehicles', 'vehicles'),
      link('/vehicles-maintenance', 'Vehicles Maintenance', 'maintenance'),
      link('/external-vehicle', 'Vehicle External', 'external_vehicles'),
      link('/vehicles-sold', 'Vehicle Sold', 'sold_vehicles'),
      link('/contracts-odometer', 'Contracts - Odometer In/Out', 'odometer'),
      link('/drivers', 'Drivers', 'drivers'),
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    links: [
      link('/reports/car-reservation', 'Car Reservation Report', 'report_car_reservation'),
      link('/reports/bookings', 'Booking Report', 'report_bookings'),
      link('/reports/contracts', 'Contracts Report', 'report_contracts'),
      link('/reports/payments', 'Payments Report', 'report_payments'),
      link(
        '/reports/customer-account-statements',
        'Customer Account Statements',
        'report_account_statements',
      ),
      link('/reports/rental-plate-number', 'Rental Plate Number Report', 'report_plate_number'),
      link(
        '/reports/transportation-vehicles',
        'Transportation Vehicles Report',
        'report_transportation',
      ),
      link('/reports/traffic-violations', 'Traffic Violation Report', 'report_traffic_violations'),
      link('/reports/extra-money', 'Extra Money Report', 'report_extra_money'),
      link('/reports/refunds', 'Refund Report', 'report_refunds'),
      link('/reports/discounts', 'Discount Report', 'report_discounts'),
      link('/reports/gasoline', 'Gasoline Report', 'report_gasoline'),
      link('/reports/vehicles', 'Vehicles Report', 'report_vehicles'),
      link('/reports/drivers', 'Driver Report', 'report_drivers'),
      link('/reports/sold-cars', 'Sold Car Report', 'report_sold_cars'),
      link('/reports/suppliers', 'Suppliers Report', 'report_suppliers'),
      link('/reports/lawsuits', 'Lawsuits Report', 'report_lawsuits'),
    ],
  },
  {
    key: 'others',
    label: 'Others',
    links: [
      link('/companies', 'My Companies', 'companies'),
      { to: '/rent/branches', text: 'My Branches', permission: null },
      link('/suppliers', 'Suppliers', 'suppliers'),
      link('/lawsuits', 'Lawsuits', 'lawsuits'),
      link('/admin-logs', 'Admin Logs', 'admin_logs'),
      link('/settings', 'Settings', 'settings'),
      link('/terms-and-conditions', 'Terms and Conditions', 'terms'),
      link('/login-image', 'Edit Login Image', 'login_image'),
      link('/charge-stations', 'Charge Stations', 'charge_stations'),
    ],
  },
]
