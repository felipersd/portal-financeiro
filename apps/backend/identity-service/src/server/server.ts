import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
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

app.get('/auth/me', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), (req, res) => authController.me(req, res));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'identity-service' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(401).send('Unauthenticated!');
});

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Identity Service running on port ${PORT}`);
});
