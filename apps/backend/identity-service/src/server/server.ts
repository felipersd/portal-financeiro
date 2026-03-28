import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { PrismaUserRepository } from '../Infrastructure/Database/PrismaUserRepository';
import { GetOrCreateUser } from '../Application/UseCases/GetOrCreateUser';
import { UserController } from '../Infrastructure/Http/UserController';
import { AuthController } from '../Infrastructure/Http/AuthController';

dotenv.config();

const app = express();

app.set('trust proxy', true);

app.use(cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);
const getOrCreateUser = new GetOrCreateUser(userRepository);
const userController = new UserController(getOrCreateUser);
const authController = new AuthController(getOrCreateUser, userRepository);

app.post('/users', (req, res) => userController.handleGetOrCreate(req, res));

const authLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log(`\n========== [DEBUG AUTH] INCOMING REQUEST ==========`);
    console.log(`URL: ${req.url} | Method: ${req.method} | IP: ${req.ip}`);
    console.log(`Protocol: ${req.protocol} | Hostname: ${req.hostname}`);
    console.log(`Headers recebidos do Nginx:`, JSON.stringify(req.headers, null, 2));
    console.log(`===================================================\n`);
    next();
};

app.get('/auth/me', authLogger, ClerkExpressWithAuth({ clockSkewInMs: 60 * 1000 } as any), (req: any, res) => {
    console.log(`[DEBUG AUTH] Clerk validou com sucesso. Payload req.auth:`, JSON.stringify(req.auth, null, 2));
    if (!req.auth || !req.auth.userId) {
        console.error('[DEBUG AUTH] Fallback Erro: Sem UserId. req.auth =', req.auth);
        return res.status(401).send('Unauthenticated!');
    }
    return authController.me(req, res);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'identity-service' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`\n========== [FATAL ERROR] MIDDLEWARE EXCEPTION ==========`);
    console.error(`Erro disparado pelo ClerkExpressWithAuth!`);
    console.error(`Headers da requisição:`, JSON.stringify(req.headers, null, 2));
    console.error(`Protocolo detectado (Importante):`, req.protocol);
    console.error(`Detalhes Reais do Erro:`, err.message || err);
    console.error(`Stack:`, err.stack);
    console.error(`========================================================\n`);
    res.status(401).send('Unauthenticated!');
});

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Identity Service running on port ${PORT}`);
});
