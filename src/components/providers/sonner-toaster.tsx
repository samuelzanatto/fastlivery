'use client'

import { Toaster } from 'sonner'

/**
 * Provedor global para os toasts usando a biblioteca "sonner".
 * A maior parte da aplicação já importa `toast` de 'sonner', porém o layout
 * Antes havia apenas o `<Toaster />` do `react-hot-toast`, impedindo a exibição
 * dos toasts disparados via `sonner`. Toda a base agora usa `sonner`.
 */
export function SonnerToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      expand
      closeButton
      toastOptions={{
        duration: 4000,
      }}
    />
  )
}
