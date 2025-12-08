import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import { PrismaUserRepository } from '../Infrastructure/Database/PrismaUserRepository';
import { GetOrCreateUser } from '../Application/UseCases/GetOrCreateUser';
import { UserController } from '../Infrastructure/Http/UserController';
import { AuthController } from '../Infrastructure/Http/AuthController';
import { configurePassport } from '../Infrastructure/Auth/PassportConfig';
import { authMiddleware } from '../Infrastructure/Http/Middleware/AuthMiddleware';

dotenv.config();

const app = express();

// Trust proxy (required for correct protocol detection behind load balancers/proxies)
app.set('trust proxy', true);

// Configure CORS to allow credentials (cookies)
app.use(cors({
    origin: true, // Allow all origins for now, or specify frontend URL
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Session Config (Required for Auth0 State)
app.use(session({
    secret: process.env.JWT_SECRET || 'default_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Initialize Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);
const getOrCreateUser = new GetOrCreateUser(userRepository);
const userController = new UserController(getOrCreateUser);
const authController = new AuthController(getOrCreateUser, userRepository);

// User Routes
app.post('/users', (req, res) => userController.handleGetOrCreate(req, res));

// Auth Routes
app.get('/auth/login', (req, res, next) => authController.login(req, res, next));
app.get('/auth/callback', (req, res, next) => authController.callback(req, res, next));
app.get('/auth/logout', (req, res) => authController.logout(req, res));
app.get('/auth/me', authMiddleware, (req, res) => authController.me(req, res));

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'identity-service' });
});

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Identity Service running on port ${PORT}`);
});
