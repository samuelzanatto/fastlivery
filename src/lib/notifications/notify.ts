import { toast } from 'sonner'

/**
 * Camada central para notificações da aplicação.
 * Mantida minimalista depois da remoção de helpers semânticos dedicados.
 * Use notify(kind, message, { description, id, duration }) para tudo.
 */
export { toast }

export type NotifyKind = 'success' | 'error' | 'info' | 'warning' | 'loading'

interface NotifyOptions {
  description?: string
  duration?: number
  id?: string | number
}

export function notify(kind: NotifyKind, message: string, options: NotifyOptions = {}) {
  const { description, duration, id } = options
  switch (kind) {
    case 'success':
      return toast.success(message, { description, duration, id })
    case 'error':
      return toast.error(message, { description, duration, id })
    case 'info':
      return toast.info(message, { description, duration, id })
    case 'warning':
      return toast.warning ? toast.warning(message, { description, duration, id }) : toast(message, { description, duration, id })
    case 'loading':
      return toast.loading(message, { description, id })
    default:
      return toast(message, { description, duration, id })
  }
}

/** Atualiza um toast existente */
export const notifyUpdate = {
  success: (id: string | number, message: string, description?: string) => toast.success(message, { id, description }),
  error: (id: string | number, message: string, description?: string) => toast.error(message, { id, description }),
  loading: (id: string | number, message: string) => toast.loading(message, { id }),
}
