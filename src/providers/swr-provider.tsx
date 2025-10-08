'use client'

import { SWRConfig } from 'swr'

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Desabilitar revalidação automática
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        // Intervalo de deduplicação de 1 minuto
        dedupingInterval: 60000,
        // Configurar manipulador de erros global
        onError: (error) => {
          console.error('SWR Error:', error)
        }
      }}
    >
      {children}
    </SWRConfig>
  )
}