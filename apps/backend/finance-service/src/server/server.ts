import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { PrismaTransactionRepository } from '../Infrastructure/Database/PrismaTransactionRepository';
import { CreateTransaction } from '../Application/UseCases/CreateTransaction';
import { GetTransactions } from '../Application/UseCases/GetTransactions';
import { UpdateTransaction } from '../Application/UseCases/UpdateTransaction';
import { DeleteTransaction } from '../Application/UseCases/DeleteTransaction';
import { TransactionController } from '../Infrastructure/Http/TransactionController';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { userResolutionMiddleware } from '../Infrastructure/Http/Middleware/UserResolutionMiddleware';
import { Logger } from '../Infrastructure/Logger';

import compression from 'compression';

dotenv.config();

const app = express();
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

// Request Logging Middleware
// Request Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        Logger.info('Request processed', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });
    next();
});

import { PrismaCategoryRepository } from '../Infrastructure/Database/PrismaCategoryRepository';
import { GetCategories } from '../Application/UseCases/GetCategories';
import { CreateCategory } from '../Application/UseCases/CreateCategory';
import { DeleteCategory } from '../Application/UseCases/DeleteCategory';
import { CategoryController } from '../Infrastructure/Http/CategoryController';
import { SeedDefaultCategories } from '../Application/UseCases/SeedDefaultCategories';

import { PrismaGroupMemberRepository } from '../Infrastructure/Database/PrismaGroupMemberRepository';
import { AddGroupMember } from '../Application/UseCases/AddGroupMember';
import { GetGroupMembers } from '../Application/UseCases/GetGroupMembers';
import { UpdateGroupMember } from '../Application/UseCases/UpdateGroupMember';
import { DeleteGroupMember } from '../Application/UseCases/DeleteGroupMember';
import { GroupMemberController } from '../Infrastructure/Http/GroupMemberController';

import { PrismaBudgetRuleRepository } from '../Infrastructure/Database/PrismaBudgetRuleRepository';
import { GetBudgetRule } from '../Application/UseCases/GetBudgetRule';
import { UpdateBudgetRule } from '../Application/UseCases/UpdateBudgetRule';
import { BudgetRuleController } from '../Infrastructure/Http/BudgetRuleController';

const prisma = new PrismaClient();

// Transaction Dependencies
const transactionRepository = new PrismaTransactionRepository(prisma);
const createTransaction = new CreateTransaction(transactionRepository);
const getTransactions = new GetTransactions(transactionRepository);
const updateTransaction = new UpdateTransaction(transactionRepository);
const deleteTransaction = new DeleteTransaction(transactionRepository);
const transactionController = new TransactionController(
    createTransaction,
    getTransactions,
    updateTransaction,
    deleteTransaction
);

import { UpdateCategory } from '../Application/UseCases/UpdateCategory';

// BudgetRule Dependencies
const budgetRuleRepository = new PrismaBudgetRuleRepository();

// Category Dependencies
const categoryRepository = new PrismaCategoryRepository(prisma);
const getCategories = new GetCategories(categoryRepository);
const createCategory = new CreateCategory(categoryRepository);
const deleteCategory = new DeleteCategory(categoryRepository);
const updateCategory = new UpdateCategory(categoryRepository);
const seedCategories = new SeedDefaultCategories(categoryRepository, budgetRuleRepository);
const categoryController = new CategoryController(getCategories, createCategory, deleteCategory, updateCategory);

// GroupMember Dependencies
const groupMemberRepository = new PrismaGroupMemberRepository(prisma);
const addGroupMember = new AddGroupMember(groupMemberRepository);
const getGroupMembersUseCase = new GetGroupMembers(groupMemberRepository);
const updateGroupMemberUseCase = new UpdateGroupMember(groupMemberRepository);
const deleteGroupMemberUseCase = new DeleteGroupMember(groupMemberRepository);
const groupMemberController = new GroupMemberController(
    addGroupMember,
    getGroupMembersUseCase,
    updateGroupMemberUseCase,
    deleteGroupMemberUseCase
);

const getBudgetRuleUseCase = new GetBudgetRule(budgetRuleRepository);
const updateBudgetRuleUseCase = new UpdateBudgetRule(budgetRuleRepository);
const budgetRuleController = new BudgetRuleController(
    getBudgetRuleUseCase,
    updateBudgetRuleUseCase
);

app.post('/transactions', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => transactionController.handleCreate(req, res));
app.get('/transactions', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => transactionController.handleGet(req, res));
app.put('/transactions/:id', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => transactionController.handleUpdate(req, res));
app.delete('/transactions/:id', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => transactionController.handleDelete(req, res));

app.post('/categories', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => categoryController.handleCreate(req, res));
app.get('/categories', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => {
    res.set('Cache-Control', 'private, max-age=300');
    return categoryController.handleGet(req, res);
});
app.put('/categories/:id', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => categoryController.handleUpdate(req, res));
app.delete('/categories/:id', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => categoryController.handleDelete(req, res));

app.post('/members', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => groupMemberController.handleCreate(req, res));
app.get('/members', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => {
    res.set('Cache-Control', 'private, max-age=300');
    return groupMemberController.handleGet(req, res);
});
app.put('/members/:id', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => groupMemberController.handleUpdate(req, res));
app.delete('/members/:id', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => groupMemberController.handleDelete(req, res));

app.get('/budget-rules/:month', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => budgetRuleController.handleGet(req, res));
app.put('/budget-rules/:month', ClerkExpressRequireAuth({ clockSkewInMs: 60 * 1000 } as any), userResolutionMiddleware, (req, res) => budgetRuleController.handleUpdate(req, res));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'finance-service' });
});

// Internal communication endpoints (Not exposed in Nginx Gateway)
import { DeleteUserFinancialData } from '../Application/UseCases/DeleteUserFinancialData';
const deleteUserFinancialData = new DeleteUserFinancialData(prisma);

app.post('/internal/users/:userId/seed', async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) return res.status(400).json({ error: 'userId is required' });
        
        await seedCategories.execute(userId);
        return res.status(200).json({ status: 'seeded' });
    } catch (err: any) {
        Logger.error('Error seeding data:', err);
        return res.status(500).json({ error: 'Internal error seeding data' });
    }
});

app.delete('/internal/users/:userId/delete', async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) return res.status(400).json({ error: 'userId is required' });
        
        await deleteUserFinancialData.execute(userId);
        return res.status(200).json({ status: 'deleted' });
    } catch (err: any) {
        Logger.error('Error deleting GDPR data:', err);
        return res.status(500).json({ error: 'Internal error wiping data' });
    }
});

const PORT = process.env.PORT || 3002;

app.listen(Number(PORT), '0.0.0.0', () => {
    Logger.info(`Finance Service running on port ${PORT}`);
});
