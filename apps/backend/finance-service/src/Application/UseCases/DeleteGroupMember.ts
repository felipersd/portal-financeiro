import { GroupMemberRepository } from '../../Domain/Interfaces/GroupMemberRepository';

export class DeleteGroupMember {
    constructor(private repository: GroupMemberRepository) { }

    async execute(id: string, userId: string): Promise<void> {
        const member = await this.repository.findById(id);
        if (!member) {
            throw new Error('Group member not found');
        }

        if (member.userId !== userId) {
            throw new Error('Unauthorized');
        }

        await this.repository.delete(id);
    }
}
