import type { Expense, Participant, SettlementBalance, SettlementTransfer } from "../types";
import { formatCurrency } from "./format";

export function calculateSettlement(participants: Participant[], expenses: Expense[]) {
  const balancesByParticipant = new Map<string, SettlementBalance>();

  participants.forEach((participant) => {
    balancesByParticipant.set(participant.id, {
      participantId: participant.id,
      participantName: participant.name,
      paidAmount: 0,
      owedAmount: 0,
      balance: 0,
    });
  });

  expenses.forEach((expense) => {
    const payer = balancesByParticipant.get(expense.payerId);

    if (payer) {
      payer.paidAmount += expense.amount;
    }

    if (expense.targetParticipantIds.length === 0) {
      return;
    }

    const share = Math.floor(expense.amount / expense.targetParticipantIds.length);
    const remainder = expense.amount - share * expense.targetParticipantIds.length;

    expense.targetParticipantIds.forEach((participantId) => {
      const target = balancesByParticipant.get(participantId);

      if (target) {
        target.owedAmount += share;
      }
    });

    if (payer) {
      payer.owedAmount += remainder;
    }
  });

  const balances = Array.from(balancesByParticipant.values()).map((balance) => ({
    ...balance,
    balance: balance.paidAmount - balance.owedAmount,
  }));

  return {
    balances,
    transfers: calculateTransfers(balances),
  };
}

function calculateTransfers(balances: SettlementBalance[]): SettlementTransfer[] {
  const debtors = balances
    .filter((balance) => balance.balance < 0)
    .map((balance) => ({ ...balance, remaining: Math.abs(balance.balance) }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = balances
    .filter((balance) => balance.balance > 0)
    .map((balance) => ({ ...balance, remaining: balance.balance }))
    .sort((a, b) => b.remaining - a.remaining);
  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      transfers.push({
        fromParticipantId: debtor.participantId,
        fromName: debtor.participantName,
        toParticipantId: creditor.participantId,
        toName: creditor.participantName,
        amount,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining === 0) {
      debtorIndex += 1;
    }

    if (creditor.remaining === 0) {
      creditorIndex += 1;
    }
  }

  return transfers;
}

export function buildSettlementShareDescription(transfers: SettlementTransfer[]) {
  if (transfers.length === 0) {
    return "정산할 금액이 없습니다.";
  }

  const visibleTransfers = transfers.slice(0, 10).map((transfer) => {
    return `${transfer.fromName} -> ${transfer.toName}: ${formatCurrency(transfer.amount)}`;
  });

  if (transfers.length > 10) {
    visibleTransfers.push(`외 ${transfers.length - 10}건은 정산에서 확인해주세요.`);
  }

  return visibleTransfers.join("\n");
}
