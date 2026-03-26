import { Request, Response } from 'express';
import { GetOrCreateUser } from '../../Application/UseCases/GetOrCreateUser';

export class UserController {
    constructor(private getOrCreateUser: GetOrCreateUser) { }

    async handleGetOrCreate(req: Request, res: Response): Promise<void> {
        try {
            const { clerkId, provider, providerId, email, name, avatar } = req.body;
            
            // Backward compatibility for clerkId or new generic approach
            const authProvider = provider || (clerkId ? 'clerk' : null);
            const authProviderId = providerId || clerkId;

            if (!authProvider || !authProviderId || !email || !name) {
                res.status(400).json({ error: 'Missing required fields: provider/providerId/clerkId, email, or name' });
                return;
            }

            const user = await this.getOrCreateUser.execute({ 
                provider: authProvider, 
                providerId: authProviderId, 
                email, 
                name, 
                avatar 
            });
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
