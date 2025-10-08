import { NextResponse } from 'next/server'

// Rota pública que serve uma página intersticial para abrir o app MercadoPago (quando possível)
// ou, em fallback, redirecionar para a URL de autorização web.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const state = url.searchParams.get('state')

    if (!state) {
      return NextResponse.json({ success: false, error: 'Missing state' }, { status: 400 })
    }

    const clientId = process.env.MERCADOPAGO_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'MERCADOPAGO_CLIENT_ID não configurado' }, { status: 500 })
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/callback`

    const country = process.env.NEXT_PUBLIC_MERCADOPAGO_COUNTRY || 'br'
    const hostByCountry: Record<string, string> = {
      br: 'https://auth.mercadopago.com.br/authorization',
      ar: 'https://auth.mercadopago.com.ar/authorization',
      mx: 'https://auth.mercadopago.com.mx/authorization',
      cl: 'https://auth.mercadopago.com.cl/authorization',
      co: 'https://auth.mercadopago.com.co/authorization',
      pe: 'https://auth.mercadopago.com.pe/authorization',
      uy: 'https://auth.mercadopago.com.uy/authorization'
    }

    const host = hostByCountry[country] ?? hostByCountry['br']

    const scopes = process.env.MERCADOPAGO_OAUTH_SCOPES
    const testFlow = process.env.MERCADOPAGO_TEST_FLOW === 'true'
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state
    })
    if (scopes) params.set('scope', scopes)
    if (testFlow) params.set('test_flow', 'true')
    const authUrl = `${host}?${params.toString()}`

    // Construir uma HTML simples que tenta abrir o app (Android intent / iOS scheme) e faz fallback para authUrl
    const authUrlEsc = authUrl.replace(/"/g, '&quot;')

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Conectar Mercado Pago</title>
    <style>body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:16px;color:#111}a{color:#0070f3}</style>
  </head>
  <body>
    <div>
      <p>Abrindo Mercado Pago... Se nada acontecer, <a id="open-web" href="${authUrlEsc}">clique aqui</a> para abrir no navegador.</p>
    </div>

    <script>
      (function(){
        const authUrl = "${authUrlEsc}";
        const now = Date.now();

        // Tenta abrir o app no Android via intent (abre app se instalado, senão cai no browser)
        if (/Android/i.test(navigator.userAgent)) {
          try {
            // Monta intent com esquema https para abrir pacote do Mercado Pago
            const intentUrl = 'intent://' + authUrl.replace(/^https?:\/\//,'') + '#Intent;scheme=https;package=com.mercadopago.wallet;end';
            window.location = intentUrl;
          } catch (e) {
            window.location = authUrl;
          }
          return;
        }

        // iOS: tenta abrir um esquema (se suportado); se não abrir, redireciona para authUrl
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // esquema hipotético; caso o app suporte universal links, o sistema poderá oferecer abrir no app
          // aqui tentamos navegar para o authUrl diretamente e deixar o sistema decidir
          window.location = authUrl;
          // fallback: se após 2s nada acontecer, garante que estamos no authUrl
          setTimeout(function(){ if (Date.now() - now < 2500) window.location = authUrl; }, 1800);
          return;
        }

        // Desktop / outros: redireciona direto para a URL de autorização
        window.location = authUrl;
      })();
    </script>
  </body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (error) {
    console.error('Erro mp-redirect:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
