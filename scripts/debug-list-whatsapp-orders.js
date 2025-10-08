const { PrismaClient } = require('../node_modules/@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const orders = await prisma.whatsappOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  console.log('Últimos pedidos WhatsApp:', orders.map(o => ({ id: o.id, total: o.totalEstimated, createdAt: o.createdAt, suppliers: o.supplierIdsDistinct, source: o.source })));
  await prisma.$disconnect();
})();
