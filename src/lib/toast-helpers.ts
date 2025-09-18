import { toast } from 'sonner'

// Tipos de toasts personalizados para a aplicação ZapLivery
export const toastHelpers = {
  // Autenticação
  auth: {
    success: (message?: string) => 
      toast.success(message || 'Operação realizada com sucesso!', {
        duration: 4000,
      }),
    
    error: (message?: string) => 
      toast.error(message || 'Erro na autenticação', {
        description: 'Verifique suas credenciais e tente novamente.',
        duration: 5000,
      }),
    
    passwordWeak: () =>
      toast.error('Senha muito fraca', {
        description: 'A senha deve atender pelo menos 3 critérios de segurança.',
        duration: 4000,
      }),
    
    signupSuccess: () =>
      toast.success('Conta criada com sucesso!', {
        description: 'Bem-vindo ao ZapLivery! Sua conta foi criada.',
        duration: 4000,
      })
  },

  // Pagamentos
  payment: {
    processing: () =>
      toast.loading('Processando pagamento...', {
        description: 'Redirecionando para a página de pagamento seguro.',
      }),
    
    success: () =>
      toast.success('Pagamento aprovado!', {
        description: 'Sua assinatura foi ativada e seu restaurante está pronto.',
        duration: 6000,
      }),
    
    failed: () =>
      toast.error('Pagamento recusado', {
        description: 'Verifique os dados do cartão e tente novamente.',
        duration: 6000,
      }),
    
    pending: () =>
      toast.info('Pagamento em processamento', {
        description: 'Aguarde a confirmação. Você receberá um email.',
        duration: 5000,
      }),
    
    checking: () =>
      toast.loading('Verificando status do pagamento...'),
  },

  // Formulários e validação
  form: {
    missingFields: () =>
      toast.error('Campos obrigatórios', {
        description: 'Preencha todos os campos obrigatórios para continuar.',
        duration: 4000,
      }),
    
    saved: (itemName?: string) =>
      toast.success(`${itemName || 'Dados'} salvos com sucesso!`, {
        duration: 3000,
      }),
    
    validationError: (message: string) =>
      toast.error('Dados inválidos', {
        description: message,
        duration: 4000,
      })
  },

  // Operações gerais do sistema
  system: {
    loading: (message: string) =>
      toast.loading(message),
    
    success: (message: string, description?: string) =>
      toast.success(message, {
        description,
        duration: 3000,
      }),
    
    error: (message: string, description?: string) =>
      toast.error(message, {
        description,
        duration: 5000,
      }),
    
    info: (message: string, description?: string) =>
      toast.info(message, {
        description,
        duration: 4000,
      }),
    
    networkError: () =>
      toast.error('Erro de conexão', {
        description: 'Verifique sua internet e tente novamente.',
        duration: 5000,
      })
  },

  // Operações do restaurante
  restaurant: {
    activated: () =>
      toast.success('Restaurante ativado!', {
        description: 'Seu restaurante está pronto para receber pedidos.',
        duration: 5000,
      }),
    
    menuUpdated: () =>
      toast.success('Cardápio atualizado', {
        description: 'As alterações já estão disponíveis para seus clientes.',
        duration: 3000,
      }),
    
    orderReceived: () =>
      toast.info('Novo pedido recebido!', {
        description: 'Verifique os detalhes no painel de pedidos.',
        duration: 4000,
      }),
    
    profileUpdated: () =>
      toast.success('Perfil atualizado', {
        description: 'As informações do restaurante foram salvas.',
        duration: 3000,
      })
  }
}

// Função utilitária para toasts com ID personalizado (para atualizações)
export const updateToast = {
  success: (id: string | number, message: string, description?: string) =>
    toast.success(message, { id, description }),
  
  error: (id: string | number, message: string, description?: string) =>
    toast.error(message, { id, description }),
  
  loading: (id: string | number, message: string) =>
    toast.loading(message, { id })
}

// Re-exportar o toast original para casos específicos
export { toast }
