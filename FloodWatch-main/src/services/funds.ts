/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fund service — treasury and allocation management, backed by the
 * FloodWatch API.
 *
 * Architecture:
 *   Component → fundService → api client → FastAPI backend
 */

import {
  FundAllocation, FundCategory, AllocateFundResponse, FundBalance, FundTransaction
} from '../types';
import { api, toApiError } from './api';

interface BackendAllocation extends Omit<FundAllocation, 'zoneName' | 'date'> {
  zone: string;
  zoneName: string;
  date: string;
  createdAt: string;
  transactionId: string;
  adminId: string;
}

function mapAllocation(a: BackendAllocation): FundAllocation {
  return {
    id: a.id,
    zoneName: a.zoneName || a.zone,
    category: a.category,
    amount: a.amount,
    date: a.date ?? a.createdAt,
    reason: a.reason,
  };
}

export const fundService = {
  async getAvailableFunds(): Promise<number> {
    try {
      const data = await api.get<FundBalance>('/funds');
      return data.remainingBalance;
    } catch {
      return 0;
    }
  },

  async getAllocations(): Promise<FundAllocation[]> {
    try {
      const data = await api.get<BackendAllocation[]>('/funds/allocations');
      return data.map(mapAllocation);
    } catch (err) {
      throw new Error(toApiError(err).message);
    }
  },

  async getTransactions(): Promise<FundTransaction[]> {
    try {
      const data = await api.get<FundTransaction[]>('/funds/transactions');
      return data;
    } catch {
      return [];
    }
  },

  async allocateFunds(
    zoneName: string,
    category: FundCategory,
    amount: number,
    reason: string
  ): Promise<AllocateFundResponse> {
    try {
      const data = await api.post<AllocateFundResponse>('/funds/allocate', {
        zone: zoneName,
        category,
        amount,
        reason: reason || 'Approved operational response fund disbursement.',
      });
      return data;
    } catch (err) {
      const e = toApiError(err);
      return { success: false, remainingBalance: 0, error: e.message };
    }
  },
};
