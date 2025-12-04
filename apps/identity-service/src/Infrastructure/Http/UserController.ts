import { Request, Response } from 'express';
import { GetOrCreateUser } from '../../Application/UseCases/GetOrCreateUser';

export class UserController {
    constructor(private getOrCreateUser: GetOrCreateUser) { }

    async handleGetOrCreate(req: Request, res: Response): Promise<void> {
        try {
            const { auth0Id, email, name, avatar } = req.body;
            if (!auth0Id || !email || !name) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const user = await this.getOrCreateUser.execute({ auth0Id, email, name, avatar });
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
