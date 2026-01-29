
import { prisma } from '../src/lib/database/prisma';

async function verify() {
    const userId = '7fedbb0b-b5be-4158-b68d-51f1fa2e826c'; // Samuel Zanatto
    const expectedPhone = '67991266785';

    console.log(`Verifying chat fetch for user: ${userId}`);

    try {
        // 1. Check User Phone
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true }
        });
        console.log('User phone in DB:', user?.phone);

        const phone = user?.phone || expectedPhone;

        // 2. Run the Query from chats.ts
        // Note: We need to respect the types if possible, but for verification we just check output.
        const whereCondition = {
            OR: [
                { customerId: userId },
                // @ts-ignore
                ...(phone ? [{ customerPhone: phone }] : [])
            ]
        };

        console.log('Query condition:', JSON.stringify(whereCondition, null, 2));

        const conversations = await prisma.conversation.findMany({
            // @ts-ignore
            where: whereCondition,
            include: {
                business: {
                    select: { name: true }
                },
                messages: {
                    take: 1
                }
            }
        });

        console.log(`Found ${conversations.length} conversations.`);
        conversations.forEach((c: any) => {
            console.log(`- Conversation ${c.id} with ${c.business.name}:`);
            console.log(`  customerId: ${c.customerId}`);
            console.log(`  customerPhone: ${c.customerPhone}`);
            console.log(`  customerName: ${c.customerName}`);
        });

        if (conversations.length > 0) {
            console.log('✅ SUCCESS: Conversations found!');
        } else {
            console.log('❌ FAILURE: No conversations found.');
        }

    } catch (e) {
        console.error('❌ ERROR:', e);
    } finally {
        // Check if disconnect is needed or available on the instance
        if (typeof (prisma as any).$disconnect === 'function') {
            await (prisma as any).$disconnect();
        }
    }
}

verify();
