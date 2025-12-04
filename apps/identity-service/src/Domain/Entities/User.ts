export class User {
    constructor(
        public readonly id: string,
        public readonly auth0Id: string,
        public readonly email: string,
        public readonly name: string,
        public readonly avatar: string | null,
        public readonly createdAt: Date
    ) { }
}
