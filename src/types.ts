import type { Timestamp } from "firebase/firestore";

export type SettlementStatus = "open" | "settled" | "closed";

export interface Settlement {
  settlementCode: string;
  settlementName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
  status: SettlementStatus;
}

export interface Participant {
  id: string;
  name: string;
  nameKey: string;
  joinedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Expense {
  id: string;
  payerId: string;
  payerName: string;
  amount: number;
  description: string;
  expenseDate: string;
  targetParticipantIds: string[];
  targetParticipantNames: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SettlementHistoryItem {
  settlementCode: string;
  settlementName: string;
  participantId: string;
  participantName: string;
  joinedAt: string;
  lastVisitedAt: string;
}

export interface SettlementBalance {
  participantId: string;
  participantName: string;
  paidAmount: number;
  owedAmount: number;
  balance: number;
}

export interface SettlementTransfer {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amount: number;
}
