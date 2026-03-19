import { GroupMember } from '../../Domain/Entities/GroupMember';
import { GroupMemberRepository } from '../../Domain/Interfaces/GroupMemberRepository';
import { v4 as uuidv4 } from 'uuid';

export class AddGroupMember {
    constructor(private repository: GroupMemberRepository) { }

    async execute(data: { name: string; surname?: string | null; email?: string | null; category: string; userId: string }): Promise<GroupMember> {
        const existingMembers = await this.repository.findByUserId(data.userId);
        if (existingMembers.length >= 10) {
            throw new Error('Maximum of 10 group members reached.');
        }

        const member = new GroupMember(
            uuidv4(),
            data.name,
            data.surname || null,
            data.email || null,
            data.category,
            data.userId,
            new Date()
        );

        return this.repository.create(member);
    }
}
