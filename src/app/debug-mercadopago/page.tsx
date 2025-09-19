'use client'

import { useEffect, useState } from 'react'

export default function DebugMercadoPagoPage() {
  const [debugInfo, setDebugInfo] = useState<{
    scriptLoaded: boolean
    mpObjectExists: boolean
    initMethod: boolean
    error: string | null
  }>({
    scriptLoaded: false,
    mpObjectExists: false,
    initMethod: false,
    error: null
  })

  useEffect(() => {
    // Verificar se o script do Mercado Pago está carregado
    const checkMPStatus = () => {
      try {
        console.log('🔍 [DEBUG] Verificando estado do Mercado Pago...')
        
        // 1. Verificar se window.MercadoPago existe
        const mpExists = typeof window !== 'undefined' && 'MercadoPago' in window
        console.log('🔍 [DEBUG] window.MercadoPago existe:', mpExists)
        
        // 2. Verificar se initMercadoPago foi chamado
        const mpInstance = (window as Window & { MercadoPago?: unknown }).MercadoPago
        console.log('🔍 [DEBUG] MercadoPago instance:', mpInstance)
        
        setDebugInfo({
          scriptLoaded: mpExists,
          mpObjectExists: mpExists,
          initMethod: mpExists && typeof mpInstance === 'function',
          error: null
        })
      } catch (error) {
        console.error('🔍 [DEBUG] Erro ao verificar Mercado Pago:', error)
        setDebugInfo(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error)
        }))
      }
    }

    // Verificar imediatamente
    checkMPStatus()
    
    // Verificar novamente após um delay para dar tempo do SDK carregar
    const timer = setTimeout(checkMPStatus, 2000)
    
    return () => clearTimeout(timer)
  }, [])

  // Teste direto do initMercadoPago
  const testDirectInit = async () => {
    try {
      console.log('🧪 [DEBUG] Testando initMercadoPago diretamente...')
      
      const { initMercadoPago } = await import('@mercadopago/sdk-react')
      
      const testKey = 'TEST-a3e5e0e4-2af1-4a63-9c50-1d073e5f6e8b'
      console.log('🧪 [DEBUG] Inicializando com chave:', testKey.substring(0, 20) + '...')
      
      initMercadoPago(testKey, { locale: 'pt-BR' })
      
      console.log('✅ [DEBUG] initMercadoPago executado com sucesso!')
      
      // Verificar novamente o estado
      setTimeout(() => {
        const mp = (window as Window & { MercadoPago?: unknown }).MercadoPago
        console.log('🔍 [DEBUG] Estado após init:', mp)
        
        setDebugInfo(prev => ({
          ...prev,
          scriptLoaded: true,
          mpObjectExists: true,
          initMethod: true,
          error: null
        }))
      }, 1000)
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro no teste direto:', error)
      setDebugInfo(prev => ({
        ...prev,
        error: `Teste direto falhou: ${error instanceof Error ? error.message : String(error)}`
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          🔍 Debug - Mercado Pago SDK
        </h1>
        
        <div className="grid gap-6">
          {/* Status do SDK */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Status do SDK</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded border">
                <span>Script Carregado:</span>
                <span className={debugInfo.scriptLoaded ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.scriptLoaded ? '✅ Sim' : '❌ Não'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded border">
                <span>window.MercadoPago existe:</span>
                <span className={debugInfo.mpObjectExists ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.mpObjectExists ? '✅ Sim' : '❌ Não'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded border">
                <span>initMercadoPago funcionando:</span>
                <span className={debugInfo.initMethod ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.initMethod ? '✅ Sim' : '❌ Não'}
                </span>
              </div>
              
              {debugInfo.error && (
                <div className="p-3 rounded border border-red-300 bg-red-50">
                  <span className="text-red-700">❌ Erro: {debugInfo.error}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={testDirectInit}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🧪 Testar initMercadoPago Diretamente
            </button>
          </div>
          
          {/* Informações do Environment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
            
            <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded">
              <div>Navigator: {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'}</div>
              <div>Location: {typeof window !== 'undefined' ? window.location.href : 'Server'}</div>
              <div>Next.js: {process.env.NODE_ENV}</div>
            </div>
          </div>
          
          {/* Console Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Instruções</h2>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p>1. Abra o Console do navegador (F12)</p>
              <p>2. Procure por logs com [DEBUG]</p>
              <p>3. Clique em &quot;Testar initMercadoPago&quot; e observe os logs</p>
              <p>4. Verifique se há erros de CORS, CSP ou outros problemas de rede</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}