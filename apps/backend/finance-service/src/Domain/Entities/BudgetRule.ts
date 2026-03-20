export class BudgetRule {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly month: string,
        public needsPct: number,
        public wantsPct: number,
        public savingsPct: number,
        public mapping: Record<string, 'needs' | 'wants' | 'savings'>
    ) {}
}
