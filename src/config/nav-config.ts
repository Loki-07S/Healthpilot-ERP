import { NavGroup } from '@/types';

export const navGroups: NavGroup[] = [
  {
    label: 'HealthPilot ERP',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        items: []
      },
      {
        title: 'Document Flow & Audit',
        url: '/dashboard/traceability',
        icon: 'galleryVerticalEnd',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Procurement',
    items: [
      {
        title: 'Requisitions',
        url: '/dashboard/requisitions',
        icon: 'forms',
        isActive: false,
        items: []
      },
      {
        title: 'Purchase Orders',
        url: '/dashboard/purchase-orders',
        icon: 'post',
        isActive: false,
        items: []
      },
      {
        title: 'Goods Receipt (GRN)',
        url: '/dashboard/grn',
        icon: 'checks',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Finance',
    items: [
      {
        title: 'Supplier Invoices',
        url: '/dashboard/invoices',
        icon: 'billing',
        isActive: false,
        items: []
      },
      {
        title: 'Credit Notes',
        url: '/dashboard/credit-notes',
        icon: 'creditCard',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Inventory',
    items: [
      {
        title: 'Stock Transfers',
        url: '/dashboard/transfers',
        icon: 'arrowRight',
        isActive: false,
        items: []
      },
      {
        title: 'Sales / Dispense',
        url: '/dashboard/sales',
        icon: 'trendingUp',
        isActive: false,
        items: []
      },
      {
        title: 'Stock Ledger',
        url: '/dashboard/ledger',
        icon: 'galleryVerticalEnd',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: '',
    items: [
      {
        title: 'Account',
        url: '#',
        icon: 'account',
        isActive: true,
        items: [
          {
            title: 'Staff Login & Roles',
            shortcut: ['l', 'l'],
            url: '/login',
            icon: 'login'
          }
        ]
      }
    ]
  }
];
