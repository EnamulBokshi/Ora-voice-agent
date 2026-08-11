'use client';

import { MOCK_CUSTOMERS } from './customers-types';
import { CustomersHeader, CustomersMetrics } from './customers-header';
import { CustomersTable } from './customers-table';

export function CustomersClient() {
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <CustomersHeader />

      {/* 5 KPI Metrics */}
      <CustomersMetrics />

      {/* Customers Table & Inspector Split View */}
      <CustomersTable customers={MOCK_CUSTOMERS} />
    </div>
  );
}
