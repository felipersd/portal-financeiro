import { GroupMember } from '../../Domain/Entities/GroupMember';
import { GroupMemberRepository } from '../../Domain/Interfaces/GroupMemberRepository';

export class GetGroupMembers {
    constructor(private repository: GroupMemberRepository) { }

    async execute(userId: string): Promise<GroupMember[]> {
        return this.repository.findByUserId(userId);
    }
}
