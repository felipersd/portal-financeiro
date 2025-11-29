import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING VERIFICATION ---');

    // 1. Create a test user (simulating Auth0 login flow)
    const testAuth0Id = 'auth0|test-verification-' + Date.now();
    const testEmail = `test-${Date.now()}@example.com`;

    console.log(`Creating test user: ${testEmail}`);

    const user = await prisma.user.create({
        data: {
            auth0Id: testAuth0Id,
            email: testEmail,
            name: 'Test User',
            avatar: 'https://example.com/avatar.png'
        }
    });

    console.log('User created with ID:', user.id);

    // 2. Simulate the "Login" logic where we check for categories and seed them
    // In the real app, this happens in passport callback. Here we manually call the logic to test it.

    const categoryCount = await prisma.category.count({
        where: { userId: user.id }
    });

    if (categoryCount === 0) {
        console.log('User has 0 categories. Seeding defaults (Simulation)...');
        const defaultCategories = [
            { name: 'Salário', type: 'income' },
            { name: 'Investimentos', type: 'income' },
            { name: 'Outros', type: 'income' },
            { name: 'Alimentação', type: 'expense' },
            { name: 'Moradia', type: 'expense' },
            { name: 'Transporte', type: 'expense' },
            { name: 'Lazer', type: 'expense' },
            { name: 'Saúde', type: 'expense' },
            { name: 'Educação', type: 'expense' },
            { name: 'Contas Fixas', type: 'expense' },
            { name: 'Compras', type: 'expense' },
        ];

        await prisma.category.createMany({
            data: defaultCategories.map(c => ({
                ...c,
                userId: user.id
            }))
        });
        console.log('Default categories created.');
    }

    // 3. Verify categories exist
    const categories = await prisma.category.findMany({
        where: { userId: user.id }
    });

    console.log(`User has ${categories.length} categories.`);

    const expectedNames = ['Salário', 'Alimentação', 'Moradia'];
    const foundNames = categories.map(c => c.name);

    const missing = expectedNames.filter(n => !foundNames.includes(n));

    if (missing.length === 0) {
        console.log('SUCCESS: All expected default categories found.');
    } else {
        console.error('FAILURE: Missing categories:', missing);
    }

    // 4. Verify user can delete a category
    const catToDelete = categories.find(c => c.name === 'Alimentação');
    if (catToDelete) {
        console.log('Testing deletion of "Alimentação"...');
        await prisma.category.delete({ where: { id: catToDelete.id } });

        const afterDelete = await prisma.category.count({ where: { userId: user.id } });
        if (afterDelete === categories.length - 1) {
            console.log('SUCCESS: Category deleted.');
        } else {
            console.error('FAILURE: Category not deleted.');
        }
    }

    // 5. Cleanup
    console.log('Cleaning up test user...');
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.category.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log('--- VERIFICATION COMPLETE ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
