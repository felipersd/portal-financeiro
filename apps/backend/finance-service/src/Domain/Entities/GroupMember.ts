export class GroupMember {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly surname: string | null,
        public readonly email: string | null,
        public readonly category: string,
        public readonly userId: string,
        public readonly createdAt: Date
    ) { }
}
