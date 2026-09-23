import { FixedRecurrences } from '../Infrastructure/Database/FixedRecurrences';
import { TransactionQueries } from '../Infrastructure/Database/TransactionQueries';
import { ShareLedger } from '../Application/UseCases/ShareLedger';
import { accountRateLimit } from '../Infrastructure/Http/Middleware/AccountRateLimit';
import { pathParam } from '../Infrastructure/Http/pathParam';
import '../Infrastructure/Environment';
import express from 'express';
import { internalAuth } from '../Infrastructure/Http/Middleware/InternalAuthMiddleware';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { prisma } from '../Infrastructure/Database/prismaClient';
import { PrismaTransactionRepository } from '../Infrastructure/Database/PrismaTransactionRepository';
import { CreateTransaction } from '../Application/UseCases/CreateTransaction';
import { GetTransactions } from '../Application/UseCases/GetTransactions';
import { UpdateTransaction } from '../Application/UseCases/UpdateTransaction';
import { DeleteTransaction } from '../Application/UseCases/DeleteTransaction';
import { TransactionController } from '../Infrastructure/Http/TransactionController';
import { sessionAuth } from '../Infrastructure/Http/Middleware/SessionAuth';
import { userResolutionMiddleware } from '../Infrastructure/Http/Middleware/UserResolutionMiddleware';
import { Logger } from '../Infrastructure/Logger';

import compression from 'compression';
import { SharingService } from '../Application/UseCases/SharingService';
import { sharingRouter } from '../Infrastructure/Http/SharingRouter';
import { respondError } from '../Infrastructure/Http/TransactionController';
import { ZodError } from 'zod';

dotenv.config();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:8080',
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
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
const budgetRuleRepository = new PrismaBudgetRuleRepository(prisma);

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

app.use(['/transactions', '/categories', '/members', '/sharing', '/budget-rules'], sessionAuth, userResolutionMiddleware, accountRateLimit(prisma));

app.post('/transactions/:id/stop-recurrence', async (req, res, next) => {
    try { await new FixedRecurrences(prisma).stop((req as any).internalUserId, pathParam(req, 'id')); res.json({success:true}); } catch (error) { next(error); }
});
app.post('/transactions', (req: express.Request, res: express.Response) => transactionController.handleCreate(req, res));
const transactionQueries = new TransactionQueries(prisma);
app.get('/transactions/page', async (req, res, next) => {
    try {
        if (typeof req.query.month !== 'string' || (req.query.cursor !== undefined && typeof req.query.cursor !== 'string')) return res.status(400).json({error:'Página inválida.'});
        res.json(await transactionQueries.page((req as any).internalUserId, req.query.month, req.query.cursor));
    } catch (error) { next(error); }
});
app.get('/transactions/annual', async (req, res, next) => {
    try { res.json(await transactionQueries.annual((req as any).internalUserId, Number(req.query.year))); }
    catch (error) { next(error); }
});
app.get('/transactions', (req: express.Request, res: express.Response) => transactionController.handleGet(req, res));
app.put('/transactions/:id', (req: express.Request, res: express.Response) => transactionController.handleUpdate(req, res));
app.delete('/transactions/:id', (req: express.Request, res: express.Response) => transactionController.handleDelete(req, res));

app.post('/categories', (req: express.Request, res: express.Response) => categoryController.handleCreate(req, res));
app.get('/categories', (req: express.Request, res: express.Response) => {
    return categoryController.handleGet(req, res);
});
app.put('/categories/:id', (req: express.Request, res: express.Response) => categoryController.handleUpdate(req, res));
app.delete('/categories/:id', (req: express.Request, res: express.Response) => categoryController.handleDelete(req, res));

app.post('/members', (req: express.Request, res: express.Response) => groupMemberController.handleCreate(req, res));
app.get('/members', (req: express.Request, res: express.Response) => {
    return groupMemberController.handleGet(req, res);
});
app.put('/members/:id', (req: express.Request, res: express.Response) => groupMemberController.handleUpdate(req, res));
app.delete('/members/:id', (req: express.Request, res: express.Response) => groupMemberController.handleDelete(req, res));

app.use('/sharing', sharingRouter(new SharingService(prisma), new ShareLedger(prisma)));

app.get('/budget-rules/:month', (req: express.Request, res: express.Response) => budgetRuleController.handleGet(req, res));
app.put('/budget-rules/:month', (req: express.Request, res: express.Response) => budgetRuleController.handleUpdate(req, res));

app.get('/health', async (req: express.Request, res: express.Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', service: 'finance-service', revision: process.env.APP_REVISION || 'development' });
    } catch {
        res.status(503).json({ status: 'unavailable' });
    }
});

// Internal communication endpoints (Not exposed in Nginx Gateway)
import { DeleteUserFinancialData } from '../Application/UseCases/DeleteUserFinancialData';
const deleteUserFinancialData = new DeleteUserFinancialData(prisma);

app.post('/internal/users/:userId/seed', internalAuth, async (req: express.Request, res: express.Response) => {
    try {
        const userId = pathParam(req, 'userId');
        if (!userId) return res.status(400).json({ error: 'userId is required' });
        
        await seedCategories.execute(userId);
        return res.status(200).json({ status: 'seeded' });
    } catch (err: any) {
        Logger.error('Error seeding data:', err);
        return res.status(500).json({ error: 'Internal error seeding data' });
    }
});

app.delete('/internal/users/:userId/delete', internalAuth, async (req: express.Request, res: express.Response) => {
    try {
        const userId = pathParam(req, 'userId');
        if (!userId) return res.status(400).json({ error: 'userId is required' });
        
        await deleteUserFinancialData.execute(userId);
        return res.status(200).json({ status: 'deleted' });
    } catch (err: any) {
        Logger.error('Error deleting GDPR data:', err);
        return res.status(500).json({ error: 'Internal error wiping data' });
    }
});

const PORT = process.env.PORT || 3002;

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof ZodError) { res.status(400).json({ error: 'Dados inválidos.', details: error.issues }); return; }
    if ([400, 401, 413].includes(error.status)) { res.status(error.status).json({ error: 'Requisição inválida ou não autenticada.' }); return; }
    respondError(res, error);
});

app.listen(Number(PORT), '0.0.0.0', () => {
    Logger.info(`Finance Service running on port ${PORT}`);
});
