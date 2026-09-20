export interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense';
}

export type Payer = string;

export interface GroupMember {
    id: string;
    name: string;
    surname: string | null;
    email: string | null;
    category: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    settlements?: Array<{ memberId: string; paidAmount: number }>;
    readOnly?: boolean;
    sharedFromName?: string;
    receivedShareId?: string;
    id: string;
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    categoryId?: string;
    date: string;
    isShared: boolean;
    isFixed?: boolean;
    payer: string;
    userId: string;
    recurrenceId?: string;
    createdAt: string;
    splitDetails?: {
        splits: Array<{ memberId: string; amount: number }>;
    };
}

export interface SharingState {
    connections: Array<{ id: string; memberId?: string; ownerName: string; email?: string;
        status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'; direction: 'incoming' | 'outgoing'; expiresAt: string }>;
    shares: Array<{ id: string; transactionId?: string; memberId?: string; ownerName: string; description: string;
        amount: number; total: number; date: string; paidByRecipient: boolean;
        status: 'pending' | 'accepted' | 'declined' | 'cancelled'; direction: 'incoming' | 'outgoing';
        paidAmount?: number; settlementAmount?: number; debtor?: 'me' | 'other' | 'thirdParty'; canAdjust?: boolean;
        proposal?: { id: string; kind: 'adjustment' | 'payment' | 'refund'; amount: number; proposedByMe: boolean } | null }>;
}

export interface FinanceSummary {
    totalIncome: number;
    totalSpent: number;
    currentBalance: number; // Income - Expenses
    netBalance: number; // Couple settlement
    memberBalances: Record<string, number>;
    hasSharedTransactions: boolean;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

export interface BudgetDivision {
    id: string;
    name: string;
    percentage: number;
    color: string;
}

export interface BudgetRule {
    revision?: number;
    id: string;
    userId: string;
    month: string;
    divisions: BudgetDivision[];
    mapping: Record<string, string>;
}

export interface ShareHistoryPage {
    items: Array<{id:string; kind:'adjustment'|'payment'|'refund'; amount:number; status:string; proposedByMe:boolean; createdAt:string; decidedAt:string|null}>;
    nextCursor: string | null;
}
