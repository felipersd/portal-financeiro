import '../Infrastructure/Environment';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { sessionAuth } from '../Infrastructure/Http/Middleware/SessionAuth';
import { PrismaUserRepository } from '../Infrastructure/Database/PrismaUserRepository';
import { GetOrCreateUser } from '../Application/UseCases/GetOrCreateUser';
import { DeleteUserAccount } from '../Application/UseCases/DeleteUserAccount';
import { AuthController } from '../Infrastructure/Http/AuthController';
import { WebhookController } from '../Infrastructure/Http/WebhookController';

dotenv.config();

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:8080',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'svix-id', 'svix-timestamp', 'svix-signature']
}));

const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);
const getOrCreateUser = new GetOrCreateUser(userRepository);
const deleteUserAccount = new DeleteUserAccount(userRepository);

const authController = new AuthController(getOrCreateUser, userRepository);
const webhookController = new WebhookController(deleteUserAccount);

// Rota de Webhook DEVE vir antes do express.json() para retermos o "Raw Body" nativo do Buffer exigido pelo Svix
app.post('/auth/webhooks', express.raw({ type: 'application/json' }), (req: express.Request, res: express.Response) => webhookController.handle(req, res));

app.use(express.json());
app.use(cookieParser());

// Identity fields come exclusively from a verified Clerk session.
app.get('/auth/me', sessionAuth, (req: express.Request, res: express.Response) => authController.me(req, res));

app.get('/health', async (req: express.Request, res: express.Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', service: 'identity-service', revision: process.env.APP_REVISION || 'development' });
    } catch {
        res.status(503).json({ status: 'unavailable' });
    }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status === 401 || err.statusCode === 401 ? 401 : 500;
    console.error('Identity request failed', { path: req.path, status });
    res.status(status).json({ error: status === 401 ? 'Unauthenticated' : 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Identity Service running on port ${PORT}`);
});
