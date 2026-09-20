import { Request, Response } from 'express';
import { GetOrCreateUser } from '../../Application/UseCases/GetOrCreateUser';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';
import { Logger } from '../Logger';
import { clerkClient } from '@clerk/express';

export class AuthController {
    constructor(
        private getOrCreateUser: GetOrCreateUser,
        private userRepository: UserRepository
    ) { }

    async me(req: Request, res: Response) {
        const clerkId = (req as any).clerkUserId;
        if (clerkId) {
            try {
                let user = await this.userRepository.findByProviderId('clerk', clerkId);
                
                if (!user) {
                    const clerkUser = await clerkClient.users.getUser(clerkId);
                    
                    const primaryEmail = clerkUser.emailAddresses.find(address => address.id === clerkUser.primaryEmailAddressId);
                    if (!primaryEmail || primaryEmail.verification?.status !== 'verified') {
                        res.status(403).json({ message: 'Verify your primary email before continuing' });
                        return;
                    }
                    const email = primaryEmail.emailAddress;
                    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User';
                    const avatar = clerkUser.imageUrl || null;

                    user = await this.getOrCreateUser.execute({
                        provider: 'clerk',
                        providerId: clerkId,
                        email: email,
                        name: name,
                        avatar: avatar
                    });
                }
                
                res.json(user);
            } catch (error) {
                if (error instanceof Error && error.message === 'IDENTITY_LINK_REQUIRED') {
                    res.status(409).json({ message: 'Este e-mail está associado a outro acesso. Use a conta original ou solicite recuperação.' });
                    return;
                }
                Logger.error('Error fetching current user profile', error, { clerkId });
                res.status(500).json({ message: 'Internal server error' });
            }
        } else {
            res.status(401).json({ message: 'Not authenticated' });
        }
    }
}
