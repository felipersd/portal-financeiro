import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import passport from 'passport';
import { configurePassport } from './auth';

const app = express();
const prisma = new PrismaClient();

app.use(cors({
    origin: ['http://localhost:5173',
        'https://portalfinanceiro.net/api/auth/callback',
        'https://www.portalfinanceiro.net/api/auth/callback',
        'https://api.portalfinanceiro.net/api/auth/callback'
    ],
    credentials: true
}));
app.set('trust proxy', 1); // Trust first proxy (Cloudflare/Vite)
app.use(express.json());

// Session Config
app.use(session({
    secret: 'secret-key-change-me', // In prod use env var
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using https behind proxy
}));

// Passport Config
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Auth Routes
app.get('/auth/login', passport.authenticate('auth0', {
    scope: 'openid email profile'
}), (req, res) => {
    res.redirect('/');
});

app.get('/auth/callback',
    passport.authenticate('auth0', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/'); // Redirect to frontend after login
    }
);

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

app.get('/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

// Middleware to protect routes
const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
};

// --- Protected Routes ---

// Get Transactions (Filtered by User)
app.get('/transactions', isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const transactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
    });
    res.json(transactions);
});

// Create Transaction
app.post('/transactions', isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { description, amount, type, category, date, isShared, payer, recurrenceFrequency, recurrenceCount, splitDetails } = req.body;

    try {
        const baseDate = new Date(date);
        const transactionsToCreate = [];
        const recurrenceId = recurrenceFrequency !== 'none' ? crypto.randomUUID() : undefined;
        const count = recurrenceFrequency !== 'none' ? (recurrenceCount || 1) : 1;

        for (let i = 0; i < count; i++) {
            const newDate = new Date(baseDate);
            if (recurrenceFrequency === 'daily') newDate.setDate(baseDate.getDate() + i);
            if (recurrenceFrequency === 'monthly') newDate.setMonth(baseDate.getMonth() + i);
            if (recurrenceFrequency === 'yearly') newDate.setFullYear(baseDate.getFullYear() + i);

            transactionsToCreate.push({
                description: count > 1 ? `${description} (${i + 1}/${count})` : description,
                amount: parseFloat(amount),
                type,
                category,
                date: newDate,
                isShared,
                payer,
                recurrenceId,
                splitDetails,
                userId // Link to user
            });
        }

        await prisma.transaction.createMany({ data: transactionsToCreate });
        res.json({ message: 'Transactions created' });
    } catch (error) {
        res.status(500).json({ error: 'Error creating transaction' });
    }
});

// Update Transaction
app.put('/transactions/:id', isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { description, amount, type, category, date, isShared, payer, splitDetails } = req.body;

    try {
        // Ensure user owns transaction
        const existing = await prisma.transaction.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Transaction not found' });

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                description,
                amount: parseFloat(amount),
                type,
                category,
                date: new Date(date),
                isShared,
                payer,
                splitDetails
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error updating transaction' });
    }
});

// Delete Transaction
app.delete('/transactions/:id', isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        const existing = await prisma.transaction.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Transaction not found' });

        await prisma.transaction.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting transaction' });
    }
});

// Get Categories
app.get('/categories', isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const categories = await prisma.category.findMany({
        where: { userId }
    });
    res.json(categories);
});

// Create Category
app.post('/categories', isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { name, type } = req.body;
    try {
        const newCategory = await prisma.category.create({
            data: { name, type, userId }
        });
        res.json(newCategory);
    } catch (error) {
        res.status(500).json({ error: 'Error creating category' });
    }
});

// Delete Category
app.delete('/categories/:id', isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        const existing = await prisma.category.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Category not found' });

        await prisma.category.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting category' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
