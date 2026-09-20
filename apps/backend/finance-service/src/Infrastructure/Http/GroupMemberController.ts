import { Request, Response } from 'express';
import { AddGroupMember } from '../../Application/UseCases/AddGroupMember';
import { GetGroupMembers } from '../../Application/UseCases/GetGroupMembers';
import { UpdateGroupMember } from '../../Application/UseCases/UpdateGroupMember';
import { DeleteGroupMember } from '../../Application/UseCases/DeleteGroupMember';
import { Logger } from '../Logger';
import { memberSchema } from './validation';
import { FinanceError } from '../../Domain/FinanceError';

export class GroupMemberController {
    constructor(
        private addGroupMember: AddGroupMember,
        private getGroupMembers: GetGroupMembers,
        private updateGroupMember: UpdateGroupMember,
        private deleteGroupMember: DeleteGroupMember
    ) { }

    async handleGet(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const members = await this.getGroupMembers.execute(userId);
            res.json(members);
        } catch (error) {
            Logger.error('Error fetching group members', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async handleCreate(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const parsed = memberSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: 'Revise o nome e o e-mail do membro.', details: parsed.error.issues });
            const data = { ...parsed.data, userId };
            const member = await this.addGroupMember.execute(data);
            res.status(201).json(member);
        } catch (error: any) {
            if (error instanceof FinanceError) return res.status(error.status).json({ error: error.message });
            Logger.error('Error creating group member', error);
            if (error.message === 'Maximum of 10 group members reached.') {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async handleUpdate(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const id = req.params.id;
            const parsed = memberSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: 'Revise o nome e o e-mail do membro.', details: parsed.error.issues });
            const data = { ...parsed.data, userId };
            const member = await this.updateGroupMember.execute(id, data);
            res.json(member);
        } catch (error: any) {
            if (error instanceof FinanceError) return res.status(error.status).json({ error: error.message });
            Logger.error('Error updating group member', error);
            if (error.message === 'Unauthorized' || error.message === 'Group member not found') {
                return res.status(error.message === 'Unauthorized' ? 403 : 404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async handleDelete(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const id = req.params.id;
            await this.deleteGroupMember.execute(id, userId);
            res.status(204).send();
        } catch (error: any) {
            if (error instanceof FinanceError) return res.status(error.status).json({ error: error.message });
            Logger.error('Error deleting group member', error);
            if (error.message === 'Unauthorized' || error.message === 'Group member not found') {
                return res.status(error.message === 'Unauthorized' ? 403 : 404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
