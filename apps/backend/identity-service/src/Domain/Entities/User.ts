export class User {
    constructor(
        public readonly id: string,
        public readonly clerkId: string,
        public readonly email: string,
        public readonly name: string,
        public readonly avatar: string | null,
        public readonly createdAt: Date
    ) { }
}
