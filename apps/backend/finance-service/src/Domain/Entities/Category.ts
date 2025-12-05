export class Category {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly type: 'income' | 'expense',
        public readonly userId: string
    ) { }
}
