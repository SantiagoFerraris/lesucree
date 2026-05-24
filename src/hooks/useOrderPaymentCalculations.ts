import { useMemo } from 'react';

export type PaymentStatus = 'pending' | 'partial' | 'complete';

export interface OrderPaymentInput {
  total_price: number;
  deposit_amount?: number | null;
  deposit_percentage?: number | null;
  is_deposit_confirmed?: boolean | null;
  status?: string | null;
  min_deposit_percentage?: number;
  max_deposit_percentage?: number;
  balance_paid_at?: string | null;
}

export interface OrderPaymentCalculations {
  depositRequired: number;
  amountPaid: number;
  remainingBalance: number;
  paymentProgress: number;
  paymentStatus: PaymentStatus;
  isDepositConfirmed: boolean;
  canConfirmDeposit: boolean;
  depositPercentage: number;
  isBalancePaid: boolean;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function useOrderPaymentCalculations(input: OrderPaymentInput): OrderPaymentCalculations {
  return useMemo(() => {
    const total = Math.max(0, Number(input.total_price) || 0);
    const pct = clamp(Number(input.deposit_percentage) || 50, 0, 100);
    const minPct = input.min_deposit_percentage ?? 30;
    const maxPct = input.max_deposit_percentage ?? 70;

    const depositRequired = Math.min(total, Math.round(total * (pct / 100)));
    const amountPaid = clamp(Number(input.deposit_amount) || 0, 0, total);
    const remainingBalance = Math.max(0, total - amountPaid);
    const paymentProgress = total > 0 ? clamp((amountPaid / total) * 100, 0, 100) : 0;

    let paymentStatus: PaymentStatus = 'pending';
    if (amountPaid >= total && total > 0) paymentStatus = 'complete';
    else if (amountPaid > 0) paymentStatus = 'partial';

    const isDepositConfirmed = !!input.is_deposit_confirmed;
    const paidPct = total > 0 ? (amountPaid / total) * 100 : 0;
    const canConfirmDeposit = amountPaid > 0 && paidPct >= minPct && paidPct <= maxPct;

    return {
      depositRequired,
      amountPaid,
      remainingBalance,
      paymentProgress,
      paymentStatus,
      isDepositConfirmed,
      canConfirmDeposit,
      depositPercentage: pct,
    };
  }, [
    input.total_price,
    input.deposit_amount,
    input.deposit_percentage,
    input.is_deposit_confirmed,
    input.status,
    input.min_deposit_percentage,
    input.max_deposit_percentage,
  ]);
}
