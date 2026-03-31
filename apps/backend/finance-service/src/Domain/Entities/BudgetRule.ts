export interface BudgetDivision {
    id: string;
    name: string;
    percentage: number;
    color: string;
}

export class BudgetRule {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly month: string,
        public divisions: BudgetDivision[],
        public mapping: Record<string, string> // categoryName -> divisionId
    ) {
        this.validate();
    }

    private validate() {
        const total = this.divisions.reduce((acc, div) => acc + div.percentage, 0);
        if (total !== 100 && this.divisions.length > 0) {
            throw new Error('A soma das divisões deve ser exatamente 100%');
        }
        if (this.divisions.length > 10) {
            throw new Error('Limite máximo de 10 divisões antigido.');
        }
    }
}
