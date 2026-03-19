import { Request, Response } from 'express';
import { GetOrCreateUser } from '../../Application/UseCases/GetOrCreateUser';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';
import { Logger } from '../Logger';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export class AuthController {
    constructor(
        private getOrCreateUser: GetOrCreateUser,
        private userRepository: UserRepository
    ) { }

    async me(req: Request, res: Response) {
        const clerkAuth = (req as any).auth;
        if (clerkAuth && clerkAuth.userId) {
            const clerkId = clerkAuth.userId;
            try {
                let user = await this.userRepository.findByClerkId(clerkId);
                
                if (!user) {
                    const clerkUser = await clerkClient.users.getUser(clerkId);
                    
                    const email = clerkUser.emailAddresses[0]?.emailAddress || 'no-email@example.com';
                    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User';
                    const avatar = clerkUser.imageUrl || null;

                    user = await this.getOrCreateUser.execute({
                        clerkId: clerkId,
                        email: email,
                        name: name,
                        avatar: avatar
                    });
                }
                
                res.json(user);
            } catch (error) {
                Logger.error('Error fetching current user profile', error, { clerkId });
                res.status(500).json({ message: 'Internal server error' });
            }
        } else {
            res.status(401).json({ message: 'Not authenticated' });
        }
    }
}
