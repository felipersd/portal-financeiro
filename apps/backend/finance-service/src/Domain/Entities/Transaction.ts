export class Transaction {
    constructor(
        public readonly id: string,
        public readonly description: string,
        public readonly amount: number,
        public readonly type: 'income' | 'expense',
        public readonly category: string,
        public readonly date: Date,
        public readonly isShared: boolean,
        public readonly payer: 'me' | 'spouse',
        public readonly userId: string,
        public readonly createdAt: Date,
        public readonly recurrenceId?: string | null,
        public readonly splitDetails?: any | null
    ) { }
}
