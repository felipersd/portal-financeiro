import { GroupMember } from '../../Domain/Entities/GroupMember';
import { GroupMemberRepository } from '../../Domain/Interfaces/GroupMemberRepository';

export class UpdateGroupMember {
    constructor(private repository: GroupMemberRepository) { }

    async execute(id: string, data: { name: string; surname?: string | null; email?: string | null; category: string; userId: string }): Promise<GroupMember> {
        const member = await this.repository.findById(id);
        if (!member) {
            throw new Error('Group member not found');
        }

        if (member.userId !== data.userId) {
            throw new Error('Unauthorized');
        }

        const updatedMember = new GroupMember(
            id,
            data.name,
            data.surname || null,
            data.email || null,
            data.category,
            data.userId,
            member.createdAt
        );

        return this.repository.update(updatedMember);
    }
}
