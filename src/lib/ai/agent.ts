import 'dotenv/config';
import { createGroq } from '@ai-sdk/groq';
import { Experimental_Agent as Agent, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/database/prisma';

/**
 * Intelligent WhatsApp Agent - Sistema Marketplace B2B
 * 
 * Características:
 * - Usa AI SDK Agent class para gerenciamento automático de loops
 * - Ferramentas inteligentes para processamento de pedidos B2B
 * - Groq como provedor principal (Meta Llama 3.3 70B ou 3.1 8B)
 * - Sistema para empresas de delivery fazerem pedidos para fornecedores
 * - Validação rigorosa de entrada e saída
 * - Comportamento natural e conversacional focado em compras B2B
 */

// Interfaces para integração com banco de dados do marketplace B2B
interface SupplierService {
  id: string;
  name: string;
  pricePerUnit: number;
  description?: string;
  stockQuantity?: number;
  unitType?: string;
  category: string;
  available: boolean;
  supplier: {
    id: string;
    company: {
      name: string;
    };
  };
}

interface CartItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  supplierName: string;
}

interface CartData {
  items: CartItem[];
  total: number;
  itemCount: number;
}

// Carrinho agora utiliza o sistema WhatsApp do banco de dados

// Função para buscar serviços de fornecedores parceiros
// Exportado para uso em camada de orquestração determinística
export async function getSupplierServices(companyId: string, searchTerm?: string): Promise<SupplierService[]> {
  try {
    console.log(`[AI Agent] Buscando serviços para empresa ${companyId}`);
    
    // Verificar o tipo da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { type: true, name: true }
    });
    
    if (!company) {
      console.log(`[AI Agent] Empresa ${companyId} não encontrada`);
      return [];
    }
    
    // Se for SUPPLIER (fornecedor), mostrar seus próprios serviços
    if (company.type === 'SUPPLIER') {
      console.log(`[AI Agent] ${company.name} é fornecedor - mostrando serviços próprios`);
      
      const supplier = await prisma.supplier.findFirst({
        where: { companyId: companyId }
      });
      
      if (!supplier) {
        console.log(`[AI Agent] Dados de supplier não encontrados para ${companyId}`);
        return [];
      }
      
      const whereClause: {
        supplierId: string;
        isActive: boolean;
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' };
          description?: { contains: string; mode: 'insensitive' };
        }>;
      } = {
        supplierId: supplier.id,
        isActive: true
      };
      
      if (searchTerm) {
        whereClause.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
      
      const services = await prisma.supplierService.findMany({
        where: whereClause,
        include: {
          supplier: {
            include: {
              company: { select: { name: true } }
            }
          }
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
      });
      
      return services.map(service => ({
        id: service.id,
        name: service.name,
        pricePerUnit: service.pricePerUnit || 0,
        description: service.description || 'Sem descrição',
        stockQuantity: service.stockQuantity,
        unitType: service.unitType,
        category: service.category,
        available: service.isActive,
        supplier: {
          id: service.supplier.id,
          company: {
            name: service.supplier.company.name
          }
        }
      }));
    }
    
    // Se for BUSINESS (empresa de delivery), buscar serviços de fornecedores parceiros
    if (company.type === 'BUSINESS') {
      console.log(`[AI Agent] ${company.name} é empresa de delivery - buscando fornecedores parceiros`);
      
      const partnerships = await prisma.partnership.findMany({
        where: {
          companyId: companyId,
          status: 'ACTIVE'
        },
        include: {
          supplier: {
            include: {
              company: { select: { name: true } }
            }
          }
        }
      });
      
      if (partnerships.length === 0) {
        console.log(`[AI Agent] Empresa ${companyId} não possui parcerias ativas`);
        return [];
      }
    
      const supplierIds = partnerships.map(p => p.supplierId);
      
      const whereClause: {
        supplierId: { in: string[] };
        isActive: boolean;
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' };
          description?: { contains: string; mode: 'insensitive' };
        }>;
      } = {
        supplierId: { in: supplierIds },
        isActive: true
      };
      
      if (searchTerm) {
        whereClause.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
      
      const services = await prisma.supplierService.findMany({
        where: whereClause,
        include: {
          supplier: {
            include: {
              company: { select: { name: true } }
            }
          }
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
      });
      
      return services.map(service => ({
        id: service.id,
        name: service.name,
        pricePerUnit: service.pricePerUnit || 0,
        description: service.description || 'Sem descrição',
        stockQuantity: service.stockQuantity,
        unitType: service.unitType,
        category: service.category,
        available: service.isActive,
        supplier: {
          id: service.supplier.id,
          company: {
            name: service.supplier.company.name
          }
        }
      }));
    }
    
    // Tipo desconhecido
    console.log(`[AI Agent] Tipo de empresa desconhecido: ${company.type}`);
    return [];
    
  } catch (error) {
    console.error('[AI Agent] Erro ao buscar serviços:', error);
    return [];
  }
}

// Exportado para orquestração
export async function addServiceToCart(
  companyId: string,
  phoneNumber: string,
  serviceId: string,
  quantity: number
): Promise<{ success: boolean; message: string; service?: { name: string; quantity: number; unitPrice: number; total: number; supplierName: string }; cart?: CartData }> {
  try {
    // Verificar se serviço existe e está disponível
    const service = await prisma.supplierService.findFirst({
      where: {
        id: serviceId,
        isActive: true
      },
      include: {
        supplier: {
          include: {
            company: { select: { name: true } }
          }
        }
      }
    });
    
    if (!service) {
      return { success: false, message: 'Serviço não encontrado ou indisponível' };
    }
    
    // Verificar autorização baseada no tipo de empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { type: true, name: true }
    });
    
    if (!company) {
      return { success: false, message: 'Empresa não encontrada' };
    }
    
    let isAuthorized = false;
    
    if (company.type === 'SUPPLIER') {
      // Para fornecedores: verificar se phoneNumber é um cliente autorizado
      const supplierClient = await prisma.supplierClient.findFirst({
        where: {
          supplierId: service.supplierId,
          phone: phoneNumber,
          whatsappEnabled: true
        }
      });
      isAuthorized = !!supplierClient;
    } else if (company.type === 'BUSINESS') {
      // Para empresas: verificar se existe parceria ativa com o fornecedor
      const partnership = await prisma.partnership.findFirst({
        where: {
          companyId: companyId,
          supplierId: service.supplierId,
          status: 'ACTIVE'
        }
      });
      isAuthorized = !!partnership;
    }
    
    if (!isAuthorized) {
      if (company.type === 'SUPPLIER') {
        return { success: false, message: 'Cliente não autorizado para este fornecedor' };
      } else {
        return { success: false, message: 'Sem parceria ativa com este fornecedor' };
      }
    }
    
    // Verificar estoque se controle estiver ativo
    if (service.trackStock) {
      const availableStock = service.stockQuantity - service.reservedQuantity;
      if (availableStock < quantity && !service.allowBackorder) {
        return { success: false, message: `Estoque insuficiente. Disponível: ${availableStock} ${service.unitType}` };
      }
    }
    
    // Usar sistema de carrinho do WhatsApp do banco
    const existingCartItem = await prisma.whatsappCartItem.findUnique({
      where: {
        companyId_phone_serviceId: {
          companyId,
          phone: phoneNumber,
          serviceId
        }
      }
    });
    
    let finalQuantity = quantity;
    
    if (existingCartItem) {
      // Atualizar quantidade existente
      finalQuantity = existingCartItem.quantity + quantity;
      await prisma.whatsappCartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: finalQuantity }
      });
    } else {
      // Criar novo item no carrinho
      await prisma.whatsappCartItem.create({
        data: {
          companyId,
          phone: phoneNumber,
          serviceId,
          quantity
        }
      });
      finalQuantity = quantity;
    }
    
    // Reservar estoque se necessário
    if (service.trackStock) {
      await prisma.supplierService.update({
        where: { id: serviceId },
        data: {
          reservedQuantity: {
            increment: quantity
          }
        }
      });
      
      // Registrar movimentação de estoque
      await prisma.supplierServiceStockMovement.create({
        data: {
          serviceId,
          type: 'RESERVATION',
          quantity,
          stockBefore: service.stockQuantity,
          stockAfter: service.stockQuantity,
          reservedBefore: service.reservedQuantity,
          reservedAfter: service.reservedQuantity + quantity,
          reason: 'Adicionado ao carrinho WhatsApp',
          reference: phoneNumber
        }
      });
    }
    
    // Recalcular carrinho
    const cart = await viewCart(companyId, phoneNumber);
    
    return {
      success: true,
      message: `${service.name} adicionado ao carrinho!`,
      service: {
        name: service.name,
        quantity: finalQuantity,
        unitPrice: service.pricePerUnit || 0,
        total: finalQuantity * (service.pricePerUnit || 0),
        supplierName: service.supplier.company.name
      },
      cart
    };
  } catch (error) {
    console.error('[AI Agent] Erro ao adicionar ao carrinho:', error);
    return { success: false, message: 'Erro ao adicionar serviço ao carrinho' };
  }
}

export async function viewCart(companyId: string, phoneNumber: string): Promise<CartData> {
  try {
    const cartItems = await prisma.whatsappCartItem.findMany({
      where: {
        companyId,
        phone: phoneNumber
      },
      include: {
        service: {
          include: {
            supplier: {
              include: {
                company: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    const items: CartItem[] = cartItems.map(item => ({
      serviceId: item.serviceId,
      serviceName: item.service.name,
      quantity: item.quantity,
      pricePerUnit: item.service.pricePerUnit || 0,
      total: item.quantity * (item.service.pricePerUnit || 0),
      supplierName: item.service.supplier.company.name
    }));
    
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    
    return { items, total, itemCount };
  } catch (error) {
    console.error('[AI Agent] Erro ao visualizar carrinho:', error);
    return { items: [], total: 0, itemCount: 0 };
  }
}

export async function removeFromCart(
  companyId: string,
  phoneNumber: string,
  serviceId?: string,
  quantity?: number,
  removeAll: boolean = false
): Promise<{ success: boolean; message: string; cart?: CartData }> {
  try {
    if (removeAll) {
      // Remover todos os itens do carrinho
      const cartItemsToRemove = await prisma.whatsappCartItem.findMany({
        where: { companyId, phone: phoneNumber },
        include: { service: true }
      });
      
      // Liberar estoque reservado
      for (const item of cartItemsToRemove) {
        if (item.service.trackStock) {
          await prisma.supplierService.update({
            where: { id: item.serviceId },
            data: {
              reservedQuantity: {
                decrement: item.quantity
              }
            }
          });
          
          // Registrar movimentação
          await prisma.supplierServiceStockMovement.create({
            data: {
              serviceId: item.serviceId,
              type: 'RELEASE',
              quantity: item.quantity,
              stockBefore: item.service.stockQuantity,
              stockAfter: item.service.stockQuantity,
              reservedBefore: item.service.reservedQuantity,
              reservedAfter: item.service.reservedQuantity - item.quantity,
              reason: 'Carrinho limpo via WhatsApp',
              reference: phoneNumber
            }
          });
        }
      }
      
      await prisma.whatsappCartItem.deleteMany({
        where: { companyId, phone: phoneNumber }
      });
      
      return {
        success: true,
        message: 'Carrinho limpo com sucesso!',
        cart: { items: [], total: 0, itemCount: 0 }
      };
    }
    
    if (!serviceId) {
      return { success: false, message: 'ID do serviço é obrigatório quando não removendo tudo' };
    }
    
    const cartItem = await prisma.whatsappCartItem.findUnique({
      where: {
        companyId_phone_serviceId: {
          companyId,
          phone: phoneNumber,
          serviceId
        }
      },
      include: { service: true }
    });
    
    if (!cartItem) {
      return { success: false, message: 'Item não encontrado no carrinho' };
    }
    
    const quantityToRemove = quantity && quantity < cartItem.quantity ? quantity : cartItem.quantity;
    const newQuantity = cartItem.quantity - quantityToRemove;
    
    if (newQuantity <= 0) {
      // Remover item completamente
      await prisma.whatsappCartItem.delete({
        where: { id: cartItem.id }
      });
    } else {
      // Atualizar quantidade
      await prisma.whatsappCartItem.update({
        where: { id: cartItem.id },
        data: { quantity: newQuantity }
      });
    }
    
    // Liberar estoque reservado
    if (cartItem.service.trackStock) {
      await prisma.supplierService.update({
        where: { id: serviceId },
        data: {
          reservedQuantity: {
            decrement: quantityToRemove
          }
        }
      });
      
      // Registrar movimentação
      await prisma.supplierServiceStockMovement.create({
        data: {
          serviceId,
          type: 'RELEASE',
          quantity: quantityToRemove,
          stockBefore: cartItem.service.stockQuantity,
          stockAfter: cartItem.service.stockQuantity,
          reservedBefore: cartItem.service.reservedQuantity,
          reservedAfter: cartItem.service.reservedQuantity - quantityToRemove,
          reason: 'Removido do carrinho via WhatsApp',
          reference: phoneNumber
        }
      });
    }
    
    const cart = await viewCart(companyId, phoneNumber);
    
    return {
      success: true,
      message: newQuantity <= 0 
        ? `${cartItem.service.name} removido completamente do carrinho!`
        : `${quantityToRemove} unidade(s) de ${cartItem.service.name} removida(s). Restam ${newQuantity} no carrinho.`,
      cart
    };
  } catch (error) {
    console.error('[AI Agent] Erro ao remover do carrinho:', error);
    return { success: false, message: 'Erro ao remover item do carrinho' };
  }
}

export async function finalizeOrder(
  companyId: string,
  phoneNumber: string,
  _customerName: string,
  _deliveryAddress?: string
): Promise<{ success: boolean; message: string; order?: { id: string; total: number; itemCount: number; status: string }; }> {
  try {
    console.debug('[finalizeOrder] start', { companyId, phoneNumber })
    // Verificar se há itens no carrinho
    const cart = await viewCart(companyId, phoneNumber);
    
    if (!cart || cart.items.length === 0) {
      return { success: false, message: 'Carrinho vazio. Adicione serviços antes de finalizar o pedido.' };
    }
    
    // Verificar se empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { 
        id: true, 
        name: true, 
        type: true
      }
    });
    
    if (!company) {
      return { success: false, message: 'Empresa não encontrada' };
    }
    // Permitimos SUPPLIER também (fluxo B2B onde fornecedor compra de outro fornecedor / cliente cadastrado manualmente)
    const isEligible = company.type === 'BUSINESS' || company.type === 'SUPPLIER';
    if (!isEligible) {
      return { success: false, message: 'Tipo de empresa não elegível para finalizar pedido via WhatsApp.' };
    }
    
    // Verificar se serviços ainda existem e calcular total
    const cartItems = await prisma.whatsappCartItem.findMany({
      where: { companyId, phone: phoneNumber },
      include: { service: { include: { supplier: { include: { company: { select: { name: true } } } } } } }
    });
    console.debug('[finalizeOrder] loaded cartItems', { count: cartItems.length })
    
    if (cartItems.length === 0) {
      return { success: false, message: 'Carrinho vazio.' };
    }
    
    // Verificar se todos os serviços ainda estão disponíveis
    const unavailableServices = cartItems.filter(item => !item.service.isActive);
    if (unavailableServices.length > 0) {
      return { success: false, message: 'Alguns serviços não estão mais disponíveis. Atualize seu carrinho.' };
    }
    
    // Preparar dados para o pedido WhatsApp
    const orderItems = cartItems.map(item => ({
      serviceId: item.serviceId,
      name: item.service.name,
      quantity: item.quantity,
      unitPrice: item.service.pricePerUnit || 0,
      supplier: item.service.supplier.company.name
    }));
    
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalDistinct = cartItems.length;
    const totalEstimated = cartItems.reduce((sum, item) => sum + (item.quantity * (item.service.pricePerUnit || 0)), 0);
    
    // Distinct supplier IDs
    const supplierIdsDistinct = Array.from(new Set(cartItems.map(ci => ci.service.supplierId)));
    console.debug('[finalizeOrder] supplierIdsDistinct', supplierIdsDistinct)
    const whatsappOrder = await prisma.whatsappOrder.create({
      data: { companyId, phone: phoneNumber, items: orderItems, totalItems, totalDistinct, totalEstimated, status: 'PENDING', supplierIdsDistinct, source: 'WHATSAPP' }
    });
    console.debug('[finalizeOrder] order created', { orderId: whatsappOrder.id })

    // Fallback broadcast manual (caso trigger não funcione)
    try {
      const { RealtimeBroadcaster } = await import('@/lib/realtime/broadcaster')
      for (const sid of supplierIdsDistinct) {
        await RealtimeBroadcaster.broadcastWhatsAppOrder(sid, 'created', {
          id: whatsappOrder.id,
          phone: phoneNumber,
          companyId,
            supplierIds: supplierIdsDistinct,
          items: orderItems,
          totalEstimated,
          status: 'PENDING',
          createdAt: whatsappOrder.createdAt.toISOString()
        })
      }
      console.debug('[finalizeOrder] fallback broadcast executed', { suppliers: supplierIdsDistinct })
    } catch (e) {
      console.warn('[finalizeOrder] fallback broadcast failed', e)
    }
    
    // Consumir estoque reservado
    for (const item of cartItems) {
      if (item.service.trackStock) {
        await prisma.supplierService.update({
          where: { id: item.serviceId },
          data: {
            stockQuantity: {
              decrement: item.quantity
            },
            reservedQuantity: {
              decrement: item.quantity
            }
          }
        });
        
        // Registrar movimentação de estoque
        await prisma.supplierServiceStockMovement.create({
          data: {
            serviceId: item.serviceId,
            type: 'CONSUMPTION',
            quantity: -item.quantity,
            stockBefore: item.service.stockQuantity,
            stockAfter: item.service.stockQuantity - item.quantity,
            reservedBefore: item.service.reservedQuantity,
            reservedAfter: item.service.reservedQuantity - item.quantity,
            reason: 'Pedido WhatsApp finalizado',
            reference: phoneNumber
          }
        });
      }
    }
    
    // Limpar carrinho
    await prisma.whatsappCartItem.deleteMany({
      where: {
        companyId,
        phone: phoneNumber
      }
    });
    
    const baseMsg = `Pedido criado com sucesso! ${totalItems} itens de ${totalDistinct} serviços. Total estimado: R$ ${totalEstimated.toFixed(2)}.`;
    const tail = company.type === 'SUPPLIER'
      ? ' O fornecedor responsável será notificado para confirmar condições.'
      : ' Os fornecedores entrarão em contato para confirmar preços e prazos.';
    return {
      success: true,
      message: baseMsg + tail,
      order: {
        id: whatsappOrder.id,
        total: totalEstimated,
        itemCount: totalItems,
        status: 'pending'
      }
    };
  } catch (error) {
    console.error('[AI Agent] Erro ao finalizar pedido (instrumented):', error)
    return { success: false, message: 'Erro ao finalizar pedido. Tente novamente.' };
  }
}

// Schemas para as ferramentas do agente

// Schemas atualizados para marketplace B2B
// searchTerm agora é opcional e pode vir como null (alguns modelos tendem a enviar null em vez de omitir)
const SearchServicesSchema = z.object({
  companyId: z.string().describe('ID da empresa de delivery'),
  searchTerm: z.string().min(0).nullable().optional().describe('Termo de busca para filtrar serviços específicos (opcional, vazio para listar todos)'),
});

const AddToCartSchema = z.object({
  companyId: z.string().describe('ID da empresa de delivery'),
  phoneNumber: z.string().describe('Número do telefone da empresa de delivery'),
  serviceId: z.string().describe('ID do serviço a ser adicionado'),
  quantity: z.number().min(1).describe('Quantidade do serviço'),
});

const ViewCartSchema = z.object({
  companyId: z.string().describe('ID da empresa de delivery'),
  phoneNumber: z.string().describe('Número do telefone da empresa de delivery'),
});

const FinalizeOrderSchemaNew = z.object({
  companyId: z.string().describe('ID da empresa de delivery'),
  phoneNumber: z.string().describe('Número do telefone da empresa de delivery'),
  customerName: z.string().describe('Nome da empresa de delivery'),
  deliveryAddress: z.string().optional().describe('Endereço da empresa (opcional)'),
  confirm: z.boolean().describe('Confirmação para finalizar o pedido'),
});

const RemoveFromCartSchema = z.object({
  companyId: z.string().describe('ID da empresa'),
  phoneNumber: z.string().describe('Número do telefone'),
  serviceId: z.string().optional().describe('ID do serviço específico a remover (opcional - se não fornecido, remove todos)'),
  quantity: z.number().optional().describe('Quantidade a remover (opcional - se não fornecido, remove tudo do serviço)'),
  removeAll: z.boolean().default(false).describe('Se true, remove todos os itens do carrinho'),
});

// Ferramenta para buscar serviços (inteligente por tipo de empresa)
const getServicesTool = tool({
  description: `Busca serviços de forma inteligente baseado no tipo de empresa:
    - FORNECEDORES: Mostra serviços próprios para venda
    - EMPRESAS DE DELIVERY: Mostra serviços de fornecedores parceiros para compra
    Use SEMPRE que perguntarem sobre produtos, serviços, catálogo ou estoque.
    Nunca mencione ou invente serviços sem usar esta ferramenta primeiro.`,
  inputSchema: SearchServicesSchema,
  execute: async ({ companyId, searchTerm }: { companyId: string; searchTerm?: string | null }) => {
    try {
      const term = (searchTerm === null || typeof searchTerm === 'undefined') ? undefined : (searchTerm.trim() === '' ? undefined : searchTerm.trim());
      const services = await getSupplierServices(companyId, term);
      return {
        success: true,
        services: services.map((s: SupplierService) => ({
          id: s.id,
          name: s.name,
          pricePerUnit: `R$ ${s.pricePerUnit.toFixed(2)}`,
          unitType: s.unitType,
          description: s.description || 'Sem descrição',
          category: s.category,
          supplier: s.supplier.company.name,
          available: s.available,
          stock: s.stockQuantity
        })),
        message: `${services.length} serviço(s) encontrado(s) de fornecedores parceiros`
      };
    } catch (error) {
      console.error('[Tool Error] getServices:', error);
      return {
        success: false,
        services: [],
        error: 'Erro ao buscar serviços',
        message: 'Não foi possível carregar os serviços no momento'
      };
    }
  },
});

// Ferramenta para adicionar ao carrinho
const addToCartTool = tool({
  description: `Adiciona serviços ao carrinho da empresa. 
    Use somente APÓS ter buscado os serviços com getServices e confirmar que o serviço existe.
    Nunca adicione serviços que não foram validados através da busca.`,
  inputSchema: AddToCartSchema,
  execute: async ({ companyId, phoneNumber, serviceId, quantity }: { companyId: string; phoneNumber: string; serviceId: string; quantity: number }) => {
    try {
      const result = await addServiceToCart(companyId, phoneNumber, serviceId, quantity);
      
      if (!result.success) {
        return {
          success: false,
          error: result.message,
          message: result.message
        };
      }
      
      return {
        success: true,
        service: result.service,
        cart: result.cart,
        message: result.message,
        totalPrice: result.service ? `R$ ${result.service.total.toFixed(2)}` : undefined
      };
    } catch (error) {
      console.error('[Tool Error] addToCart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Não foi possível adicionar o serviço ao carrinho'
      };
    }
  },
});

// Ferramenta para ver carrinho
const viewCartTool = tool({
  description: `Mostra o conteúdo atual do carrinho da empresa com todos os serviços e total estimado.`,
  inputSchema: ViewCartSchema,
  execute: async ({ companyId, phoneNumber }: { companyId: string; phoneNumber: string }) => {
    try {
      const cart = await viewCart(companyId, phoneNumber);
      return {
        success: true,
        cart,
        itemCount: cart.itemCount,
        total: `R$ ${cart.total.toFixed(2)}`,
        isEmpty: cart.items.length === 0,
        suppliers: cart.items.length > 0 ? [...new Set(cart.items.map(item => item.supplierName))] : []
      };
    } catch (error) {
      console.error('[Tool Error] viewCart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Não foi possível carregar o carrinho'
      };
    }
  },
});

// Ferramenta para remover itens do carrinho
const removeFromCartTool = tool({
  description: `Remove itens do carrinho da empresa.
    Use quando o cliente quiser remover produtos específicos ou limpar o carrinho.
    Palavras-chave: "remover", "tirar", "excluir", "limpar carrinho", "esvaziar".`,
  inputSchema: RemoveFromCartSchema,
  execute: async ({ companyId, phoneNumber, serviceId, quantity, removeAll }: { companyId: string; phoneNumber: string; serviceId?: string; quantity?: number; removeAll: boolean }) => {
    try {
      const result = await removeFromCart(companyId, phoneNumber, serviceId, quantity, removeAll);
      
      return {
        success: result.success,
        message: result.message,
        cart: result.cart
      };
    } catch (error) {
      console.error('[Tool Error] removeFromCart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Não foi possível remover item do carrinho'
      };
    }
  },
});

// Ferramenta para finalizar pedido
const finalizeOrderTool = tool({
  description: `Finaliza o pedido atual da empresa. 
    Use quando a empresa confirmar explicitamente que quer finalizar/confirmar/concluir o pedido.
    Palavras-chave: "finalizar", "confirmar", "fechar pedido", "concluir", "fazer pedido".`,
  inputSchema: FinalizeOrderSchemaNew,
  execute: async ({ companyId, phoneNumber, customerName, deliveryAddress, confirm }: { companyId: string; phoneNumber: string; customerName: string; deliveryAddress?: string; confirm: boolean }) => {
    if (!confirm) {
      return {
        success: false,
        message: 'Pedido não foi confirmado'
      };
    }

    try {
      const result = await finalizeOrder(companyId, phoneNumber, customerName, deliveryAddress);
      
      if (!result.success) {
        return {
          success: false,
          error: result.message,
          message: result.message
        };
      }
      
      return {
        success: true,
        order: result.order,
        message: result.message
      };
    } catch (error) {
      console.error('[Tool Error] finalizeOrder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Não foi possível finalizar o pedido'
      };
    }
  },
});

/**
 * Sistema Inteligente de Modelos Groq com Fallback Automático
 * Otimizado para lidar com rate limits e maximizar disponibilidade
 */

// Configuração de modelos por prioridade (apenas modelos ativos)
const GROQ_MODELS = {
  // Modelos rápidos e econômicos (menor consumo de tokens)
  FAST: {
    name: 'llama-3.1-8b-instant',
    maxTokens: 131072,
    speed: 'fastest',
    cost: 'lowest',
    description: 'Mais rápido e econômico'
  },
  
  // Modelos premium (maior consumo de tokens) - Único modelo 70B ativo
  PREMIUM: {
    name: 'llama-3.3-70b-versatile',
    maxTokens: 131072, 
    speed: 'slower',
    cost: 'highest',
    description: 'Mais avançado, maior consumo'
  },
  
  // Modelo alternativo GPT OSS (fallback)
  ALTERNATIVE: {
    name: 'openai/gpt-oss-20b',
    maxTokens: 131072,
    speed: 'balanced',
    cost: 'medium',
    description: 'Alternativa OpenAI OSS'
  }
} as const;

// Service tiers do Groq (por ordem de prioridade de custo)
const SERVICE_TIERS = {
  FLEX: 'flex',        // Mais barato, pode ter latência variável
  AUTO: 'auto',        // Automático, balanceado
  ON_DEMAND: undefined // Padrão, sem service tier específico
} as const;

function getAIModel() {
  // Verificar se há uma chave API configurada
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY não encontrada nas variáveis de ambiente');
  }
  
  // Determinar modelo baseado na configuração ou usar fallback inteligente
  const modelConfig = getOptimalModelConfig();
  
  console.log(`[AI Model] Usando Groq modelo ${modelConfig.name} (${modelConfig.description})`);
  if (modelConfig.serviceTier) {
    console.log(`[AI Model] Service Tier: ${modelConfig.serviceTier}`);
  }
  
  // Criar instância do Groq
  const groq = createGroq({
    apiKey,
  });
  
  return groq(modelConfig.name);
}

/**
 * Determina o modelo ideal baseado em configuração ou fallback automático
 */
function getOptimalModelConfig() {
  // Se modelo específico foi configurado via env
  if (process.env.GROQ_MODEL) {
    return {
      name: process.env.GROQ_MODEL,
      serviceTier: process.env.GROQ_SERVICE_TIER || SERVICE_TIERS.FLEX,
      description: 'Configurado manualmente'
    };
  }
  
  // Estratégia automática baseada no horário/uso
  const hour = new Date().getHours();
  const isBusinessHour = hour >= 8 && hour <= 18;
  
  // Durante horário comercial, usar modelo mais rápido para lidar com volume
  if (isBusinessHour) {
    return {
      name: GROQ_MODELS.FAST.name,
      serviceTier: SERVICE_TIERS.FLEX,
      description: `${GROQ_MODELS.FAST.description} (horário comercial)`
    };
  }
  
  // Fora do horário comercial, pode usar modelo premium (menor volume)
  return {
    name: GROQ_MODELS.PREMIUM.name,
    serviceTier: SERVICE_TIERS.FLEX, 
    description: `${GROQ_MODELS.PREMIUM.description} (fora do horário)`
  };
}

/**
 * Sistema Prompt Otimizado - Marketplace B2B Inteligente
 */
const SYSTEM_PROMPT = `Você é um assistente inteligente brasileiro para marketplace B2B via WhatsApp.

CONTEXTO DUAL:
1. FORNECEDORES: Mostram seus próprios produtos/serviços para venda
2. EMPRESAS DE DELIVERY: Fazem pedidos de fornecedores parceiros

O sistema identifica automaticamente o tipo de empresa e ajusta o comportamento.

INSTRUÇÕES CRÍTICAS:
1. Responda em português brasileiro.
2. EXECUTE as ferramentas quando necessário - não descreva o que vai fazer.
3. Perguntas sobre produtos/serviços/catálogo/estoque: EXECUTE getServices imediatamente.
4. Saudações simples (ex: “oi”, “olá”, “boa tarde”) SEM intenção de catálogo: responda com uma saudação curta + convite para pedir o catálogo. NÃO chame getServices nesses casos.
5. Para FORNECEDORES: Mostre produtos próprios para venda.
6. Para EMPRESAS: Mostre produtos de fornecedores para compra.
7. Sempre mencione que preços podem ser negociáveis quando listar itens.
8. Se o usuário pedir “listar produtos” sem termo específico, chame getServices com searchTerm vazio (pode ser omitido ou null). Nunca envie searchTerm = null explicitamente; prefira omitir ou usar string vazia.
9. Nunca invente IDs ou produtos; sempre use o resultado mais recente de getServices antes de addToCart.

FERRAMENTAS E PARÂMETROS EXATOS:
- getServices(companyId, searchTerm?): Busca serviços - APENAS companyId e (opcional) searchTerm
- addToCart(companyId, phoneNumber, serviceId, quantity): Adiciona ao carrinho
- viewCart(companyId, phoneNumber): Mostra carrinho
- removeFromCart(companyId, phoneNumber, serviceId, quantity, removeAll): Remove do carrinho
- finalizeOrder(companyId, phoneNumber, customerName, deliveryAddress, confirm): Finaliza pedido

ATENÇÃO: Use APENAS os parâmetros listados acima. NÃO adicione 'name', 'phone' ou outros campos extras.

NUNCA diga que "vai usar" uma ferramenta - apenas USE-A diretamente.

EXEMPLOS:
Usuário: oi
Assistente: Olá! Posso te enviar nosso catálogo. Diga por exemplo: "listar produtos" ou mande o nome de um item que procura.

Usuário: listar produtos
(usa getServices com { companyId })

Usuário: Tem coca cola?
(usa getServices com { companyId, searchTerm: "coca" })

Usuário: adicionar 3 coca cola
Fluxo: (1) getServices (se ainda não executado recentemente) (2) addToCart com o ID correto

Usuário: remover coca cola
Fluxo: viewCart para confirmar → removeFromCart com serviceId correspondente

Se dúvida sobre o carrinho: usar viewCart primeiro antes de responder.
`;

/**
 * Função para criar agente com configurações dinâmicas
 */
function createOptimizedAgent() {
  const modelConfig = getOptimalModelConfig();
  
  // Configurações otimizadas baseadas no modelo
  const isLightModel = modelConfig.name.includes('8b');
  
  return new Agent({
    model: getAIModel(),
    system: SYSTEM_PROMPT,
    tools: {
      getServices: getServicesTool,
      addToCart: addToCartTool,
      viewCart: viewCartTool,
      removeFromCart: removeFromCartTool,
      finalizeOrder: finalizeOrderTool,
    },
    
    // Configurações adaptativas baseadas no modelo
    stopWhen: stepCountIs(isLightModel ? 3 : 5), // Reduzido para execução mais direta
    
    // Força uso de tools quando necessário
    toolChoice: 'auto', // Permite que o modelo decida quando usar tools
  });
}

/**
 * Agente Principal do WhatsApp
 * Sistema inteligente com fallback automático entre modelos Groq
 */
export const whatsappAgent = createOptimizedAgent();

/**
 * Interface principal para processar mensagens do WhatsApp
 * Otimizada para uso com Groq (Meta Llama 3.3 70B / 3.1 8B)
 */
/**
 * Sistema avançado de fallback entre modelos Groq
 */
async function processWithFallback(
  contextualMessage: string,
  customerName: string,
  attempt: number = 0
): Promise<string> {
  const MAX_ATTEMPTS = 3;
  const FALLBACK_MODELS = [
    GROQ_MODELS.PREMIUM.name,     // Primeiro: modelo premium
    GROQ_MODELS.ALTERNATIVE.name, // Segundo: modelo alternativo
    GROQ_MODELS.FAST.name         // Terceiro: modelo rápido
  ];
  
  const FALLBACK_SERVICE_TIERS = [
    SERVICE_TIERS.FLEX,        // Primeiro: flex (mais barato)
    SERVICE_TIERS.AUTO,        // Segundo: auto
    SERVICE_TIERS.ON_DEMAND    // Terceiro: on_demand (padrão)
  ];
  
  if (attempt >= MAX_ATTEMPTS) {
    throw new Error('Todos os modelos falharam após tentativas de fallback');
  }
  
  try {
    // Criar agente com modelo específico para esta tentativa
    const modelName = FALLBACK_MODELS[attempt];
    const serviceTier = FALLBACK_SERVICE_TIERS[attempt];
    
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
    const model = groq(modelName);
    
    const isLightModel = modelName.includes('8b');
    
    const fallbackAgent = new Agent({
      model,
      system: SYSTEM_PROMPT,
      tools: {
        getServices: getServicesTool,
        addToCart: addToCartTool,
        viewCart: viewCartTool,
        removeFromCart: removeFromCartTool,
        finalizeOrder: finalizeOrderTool,
      },
      stopWhen: stepCountIs(isLightModel ? 3 : 4), // Reduzido para execução mais direta
      toolChoice: 'auto', // Permite que o modelo decida quando usar tools
      
      // Aplicar service tier se disponível
      ...(serviceTier && {
        experimental_providerMetadata: {
          groq: {
            service_tier: serviceTier
          }
        }
      })
    });
    
    console.log(`[Fallback ${attempt + 1}] Tentando modelo ${modelName} com service tier ${serviceTier || 'padrão'}`);
    
    const result = await fallbackAgent.generate({
      prompt: contextualMessage,
    });
    
    console.log(`[Fallback ${attempt + 1}] ✅ Sucesso com ${modelName}`);
    return result.text;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.log(`[Fallback ${attempt + 1}] ❌ Falhou com ${FALLBACK_MODELS[attempt]}: ${errorMessage}`);
    
    // Se é rate limit, tentar próximo modelo
    if (errorMessage.includes('rate_limit_exceeded') || errorMessage.includes('Rate limit')) {
      console.log(`[Fallback ${attempt + 1}] Rate limit detectado, tentando próximo modelo...`);
      return processWithFallback(contextualMessage, customerName, attempt + 1);
    }
    
    // Para outros erros, também tentar fallback
    if (attempt < MAX_ATTEMPTS - 1) {
      console.log(`[Fallback ${attempt + 1}] Erro genérico, tentando próximo modelo...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Delay crescente
      return processWithFallback(contextualMessage, customerName, attempt + 1);
    }
    
    throw error;
  }
}

export async function processWhatsAppMessage(
  message: string,
  companyId: string,
  customerPhone: string,
  customerName: string
): Promise<string> {
  try {
    console.log(`[WhatsApp Agent - Groq] Processando mensagem de ${customerName} (${customerPhone}): "${message}"`);
    
    // Contexto otimizado e mais conciso para economizar tokens
    const contextualMessage = `Cliente: ${customerName}
Msg: "${message}"

Params: companyId="${companyId}", phone="${customerPhone}", name="${customerName}"

Responda como vendedor BR amigável. Use ferramentas quando necessário.`;

    // Usar sistema de fallback inteligente
    const result = await processWithFallback(contextualMessage, customerName);
    
    console.log(`[WhatsApp Agent - Groq] ✅ Resposta gerada: "${result.substring(0, 100)}..."`);
    
    return result;
    
  } catch (error) {
    console.error('[WhatsApp Agent - Groq] ❌ Erro após todos os fallbacks:', error);
    
    // Mensagens de fallback mais específicas
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return `Olá ${customerName}! Problema com a configuração da IA. Entre em contato com o suporte. 🤖`;
      }
      
      if (error.message.includes('rate_limit_exceeded') || error.message.includes('Rate limit')) {
        const waitTime = extractWaitTime(error.message) || '5 minutos';
        return `Olá ${customerName}! Sistema temporariamente sobrecarregado. Aguarde ${waitTime} e tente novamente. 🤖`;
      }
      
      if (error.message.includes('todos os modelos falharam')) {
        return `Olá ${customerName}! Sistema de IA indisponível. Nossa equipe foi notificada. Tente novamente em alguns minutos. 🤖`;
      }
    }
    
    return `Olá ${customerName}! Dificuldades técnicas temporárias. Nossa equipe está trabalhando nisso. 🤖`;
  }
}

/**
 * Extrai tempo de espera da mensagem de erro do Groq
 */
function extractWaitTime(errorMessage: string): string | null {
  const match = errorMessage.match(/try again in (\d+m\d+\.\d+s|\d+m|\d+s)/);
  return match ? match[1] : null;
}

/**
 * Função utilitária para testar o agente
 */
export async function testAgent(message: string, companyId: string = 'test-company') {
  return processWhatsAppMessage(message, companyId, '5511999999999', 'Cliente Teste');
}

