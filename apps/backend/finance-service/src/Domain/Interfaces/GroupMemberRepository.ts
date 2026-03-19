import { GroupMember } from '../Entities/GroupMember';

export interface GroupMemberRepository {
    create(member: GroupMember): Promise<GroupMember>;
    findByUserId(userId: string): Promise<GroupMember[]>;
    findById(id: string): Promise<GroupMember | null>;
    update(member: GroupMember): Promise<GroupMember>;
    delete(id: string): Promise<void>;
}
