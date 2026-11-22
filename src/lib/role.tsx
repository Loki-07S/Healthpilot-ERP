'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type DemoRole = 'ADMIN' | 'PURCHASE_MANAGER' | 'STORE_KEEPER' | 'PHARMACIST' | 'ACCOUNTS';

export interface UserPersona {
  id: string;
  code: string;
  name: string;
  role: DemoRole;
  title: string;
  department: string;
  locationName: string;
  color: string;
  avatarText: string;
  canDo: string[];
  cannotDo: string[];
}

export const USER_PERSONAS: Record<DemoRole, UserPersona> = {
  PHARMACIST: {
    id: 'usr-rx',
    code: 'USR-RX',
    name: 'Dr. Priya Sharma',
    role: 'PHARMACIST',
    title: 'Chief Branch Pharmacist',
    department: 'Branch A Dispensary',
    locationName: 'Branch A',
    color: 'bg-emerald-600',
    avatarText: 'PS',
    canDo: [
      'Raise branch stock requirements (MR)',
      'Confirm receipt of transferred stock at branch',
      'Dispense prescriptions to patients (FEFO picking & COGS)'
    ],
    cannotDo: [
      'Approve requisitions or issue supplier POs',
      'Receive central warehouse shipments (GRN)',
      'Process supplier invoices or credit notes'
    ]
  },
  PURCHASE_MANAGER: {
    id: 'usr-pm',
    code: 'USR-PM',
    name: 'Vikram Malhotra',
    role: 'PURCHASE_MANAGER',
    title: 'Head of Procurement',
    department: 'Central Purchasing Team',
    locationName: 'Central Purchasing',
    color: 'bg-blue-600',
    avatarText: 'VM',
    canDo: [
      'Review & approve branch material requisitions',
      'Issue formal supplier Purchase Orders (PO)',
      'Manage supplier delivery schedules and terms'
    ],
    cannotDo: [
      'Perform physical goods receipt or Reverse & Amend',
      'Dispense medication or transfer stock',
      'Process commercial payments or credit notes'
    ]
  },
  STORE_KEEPER: {
    id: 'usr-sk',
    code: 'USR-SK',
    name: 'Ramesh Patel',
    role: 'STORE_KEEPER',
    title: 'Warehouse & Receiving Officer',
    department: 'Central Pharmacy Warehouse',
    locationName: 'Central Warehouse',
    color: 'bg-amber-600',
    avatarText: 'RP',
    canDo: [
      'Inspect incoming deliveries against supplier delivery challans',
      'Create Goods Receipt Notes (Accepted vs. Damaged vs. Short)',
      'Execute Reverse & Amend on receiving errors',
      'Dispatch inter-branch transfers (In-Transit)'
    ],
    cannotDo: [
      'Approve requisitions or create POs',
      'Dispense prescriptions to patients',
      'Verify invoices or issue credit notes'
    ]
  },
  ACCOUNTS: {
    id: 'usr-ac',
    code: 'USR-AC',
    name: 'Sneha Kulkarni',
    role: 'ACCOUNTS',
    title: 'Senior Accounts Officer',
    department: 'Finance & Accounts',
    locationName: 'Headquarters Finance',
    color: 'bg-rose-600',
    avatarText: 'SK',
    canDo: [
      'Enter supplier commercial invoices',
      'Automated Three-Way Match (PO ↔ GRN ↔ Invoice)',
      'Record supplier Credit Notes for short & damaged discrepancies',
      'Authorize accounts payable disbursements'
    ],
    cannotDo: [
      'Receive physical goods or dispatch stock',
      'Dispense clinical prescriptions',
      'Create or approve purchase orders'
    ]
  },
  ADMIN: {
    id: 'usr-admin',
    code: 'USR-ADMIN',
    name: 'Dr. Alok Verma',
    role: 'ADMIN',
    title: 'Hospital Group Director / Auditor',
    department: 'Executive Administration',
    locationName: 'All Locations',
    color: 'bg-purple-600',
    avatarText: 'AV',
    canDo: [
      'Full administrative access across all locations and modules',
      'Audit stock ledger and document traceability chains',
      'Reset test scenarios and override system holds'
    ],
    cannotDo: []
  }
};

export const DEMO_ROLES: Array<{
  value: DemoRole;
  label: string;
  name: string;
  department: string;
  color: string;
}> = [
  {
    value: 'PHARMACIST',
    label: 'Pharmacist',
    name: 'Dr. Priya Sharma',
    department: 'Branch A Dispensary',
    color: 'bg-emerald-600'
  },
  {
    value: 'PURCHASE_MANAGER',
    label: 'Purchase Manager',
    name: 'Vikram Malhotra',
    department: 'Central Purchasing',
    color: 'bg-blue-600'
  },
  {
    value: 'STORE_KEEPER',
    label: 'Store Keeper',
    name: 'Ramesh Patel',
    department: 'Central Warehouse',
    color: 'bg-amber-600'
  },
  {
    value: 'ACCOUNTS',
    label: 'Accounts Officer',
    name: 'Sneha Kulkarni',
    department: 'Finance & Accounts',
    color: 'bg-rose-600'
  },
  {
    value: 'ADMIN',
    label: 'Administrator',
    name: 'Dr. Alok Verma',
    department: 'Executive Admin',
    color: 'bg-purple-600'
  }
];

export const ROLE_KEY = 'hp_active_role';
export const ROLE_COOKIE = 'hp_demo_role';

export type PermittedAction =
  | 'CREATE_REQUISITION'
  | 'APPROVE_REQUISITION'
  | 'CREATE_PO'
  | 'RECEIVE_GRN'
  | 'REVERSE_AMEND_GRN'
  | 'DISPATCH_TRANSFER'
  | 'RECEIVE_TRANSFER'
  | 'DISPENSE_PRESCRIPTION'
  | 'CREATE_INVOICE'
  | 'ISSUE_CREDIT_NOTE'
  | 'RESET_SCENARIO';

export const ROLE_PERMISSIONS: Record<DemoRole, PermittedAction[]> = {
  ADMIN: [
    'CREATE_REQUISITION',
    'APPROVE_REQUISITION',
    'CREATE_PO',
    'RECEIVE_GRN',
    'REVERSE_AMEND_GRN',
    'DISPATCH_TRANSFER',
    'RECEIVE_TRANSFER',
    'DISPENSE_PRESCRIPTION',
    'CREATE_INVOICE',
    'ISSUE_CREDIT_NOTE',
    'RESET_SCENARIO'
  ],
  PHARMACIST: ['CREATE_REQUISITION', 'RECEIVE_TRANSFER', 'DISPENSE_PRESCRIPTION'],
  PURCHASE_MANAGER: ['APPROVE_REQUISITION', 'CREATE_PO'],
  STORE_KEEPER: ['RECEIVE_GRN', 'REVERSE_AMEND_GRN', 'DISPATCH_TRANSFER'],
  ACCOUNTS: ['CREATE_INVOICE', 'ISSUE_CREDIT_NOTE']
};

export const ACTION_REQUIRED_ROLES: Record<PermittedAction, string> = {
  CREATE_REQUISITION: 'Pharmacist or Admin',
  APPROVE_REQUISITION: 'Purchase Manager or Admin',
  CREATE_PO: 'Purchase Manager or Admin',
  RECEIVE_GRN: 'Store Keeper or Admin',
  REVERSE_AMEND_GRN: 'Store Keeper or Admin',
  DISPATCH_TRANSFER: 'Store Keeper or Admin',
  RECEIVE_TRANSFER: 'Pharmacist or Admin',
  DISPENSE_PRESCRIPTION: 'Pharmacist or Admin',
  CREATE_INVOICE: 'Accounts Officer or Admin',
  ISSUE_CREDIT_NOTE: 'Accounts Officer or Admin',
  RESET_SCENARIO: 'Admin only'
};

interface RoleContextType {
  role: DemoRole;
  user: UserPersona;
  roleInfo: UserPersona;
  setRole: (newRole: DemoRole) => void;
  can: (action: PermittedAction) => boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: 'ADMIN',
  user: USER_PERSONAS.ADMIN,
  roleInfo: USER_PERSONAS.ADMIN,
  setRole: () => {},
  can: () => true
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<DemoRole>('ADMIN');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ROLE_KEY) as DemoRole | null;
      if (stored && stored in USER_PERSONAS) {
        setRoleState(stored);
        document.cookie = `${ROLE_COOKIE}=${stored}; path=/; max-age=604800; SameSite=Lax`;
        return;
      }
      const match = document.cookie.match(new RegExp(`(?:^|; )${ROLE_COOKIE}=([^;]*)`));
      const cookieVal = match ? (decodeURIComponent(match[1]) as DemoRole) : null;
      if (cookieVal && cookieVal in USER_PERSONAS) {
        setRoleState(cookieVal);
        localStorage.setItem(ROLE_KEY, cookieVal);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleSetRole = (newRole: DemoRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(ROLE_KEY, newRole);
      document.cookie = `${ROLE_COOKIE}=${newRole}; path=/; max-age=604800; SameSite=Lax`;
    } catch {
      // Ignore
    }
  };

  const user = USER_PERSONAS[role] ?? USER_PERSONAS.ADMIN;
  const can = (action: PermittedAction): boolean => {
    return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        user,
        roleInfo: user,
        setRole: handleSetRole,
        can
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
