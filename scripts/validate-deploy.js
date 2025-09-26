#!/usr/bin/env node

/**
 * Script de validação pré-deploy para FastLivery
 * Verifica se todas as configurações necessárias estão presentes
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Validando configurações para deploy...\n');

let hasErrors = false;
let hasWarnings = false;

// Variáveis obrigatórias
const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'BETTER_AUTH_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_STARTER_PRICE_ID',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_ENTERPRISE_PRICE_ID',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'CRON_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

// Variáveis recomendadas
const recommendedEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'INTERNAL_API_KEY',
  'CLEANUP_API_TOKEN'
];

// Verificar variáveis de ambiente
function checkEnvironmentVariables() {
  console.log('📋 Verificando variáveis de ambiente...');
  
  const missingRequired = [];
  const missingRecommended = [];
  
  // Verificar obrigatórias
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    }
  });
  
  // Verificar recomendadas
  recommendedEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingRecommended.push(varName);
    }
  });
  
  if (missingRequired.length > 0) {
    console.log('❌ Variáveis OBRIGATÓRIAS faltando:');
    missingRequired.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    hasErrors = true;
  }
  
  if (missingRecommended.length > 0) {
    console.log('⚠️  Variáveis RECOMENDADAS faltando:');
    missingRecommended.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    hasWarnings = true;
  }
  
  if (missingRequired.length === 0) {
    console.log('✅ Todas as variáveis obrigatórias estão configuradas');
  }
}

// Verificar configurações do Stripe
function checkStripeConfig() {
  console.log('\n💳 Verificando configurações do Stripe...');
  
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeKey) {
    console.log('❌ STRIPE_SECRET_KEY não configurada');
    return;
  }
  
  if (stripeKey.startsWith('sk_test_')) {
    console.log('⚠️  Usando chave de TESTE do Stripe');
    console.log('   Para produção, use chaves sk_live_*');
    hasWarnings = true;
  } else if (stripeKey.startsWith('sk_live_')) {
    console.log('✅ Usando chave de PRODUÇÃO do Stripe');
  } else {
    console.log('❌ Chave do Stripe em formato inválido');
    hasErrors = true;
  }
  
  // Verificar IDs dos preços
  const priceIds = [
    process.env.STRIPE_STARTER_PRICE_ID,
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.STRIPE_ENTERPRISE_PRICE_ID
  ];
  
  const invalidPriceIds = priceIds.filter(id => id && !id.startsWith('price_'));
  if (invalidPriceIds.length > 0) {
    console.log('❌ IDs de preços do Stripe em formato inválido');
    hasErrors = true;
  }
}

// Verificar arquivos necessários
function checkRequiredFiles() {
  console.log('\n📁 Verificando arquivos necessários...');
  
  const requiredFiles = [
    'package.json',
    'next.config.ts',
    'middleware.ts',
    'vercel.json',
    'prisma/schema.prisma'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.log('❌ Arquivos obrigatórios faltando:');
    missingFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
    hasErrors = true;
  } else {
    console.log('✅ Todos os arquivos necessários estão presentes');
  }
}

// Verificar configuração do Next.js
function checkNextConfig() {
  console.log('\n⚡ Verificando configuração do Next.js...');
  
  try {
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Verificar se source maps estão desabilitados
    if (nextConfigContent.includes('productionBrowserSourceMaps: false')) {
      console.log('✅ Source maps desabilitados em produção');
    } else {
      console.log('⚠️  Source maps podem estar habilitados em produção');
      hasWarnings = true;
    }
    
    // Verificar headers de segurança
    if (nextConfigContent.includes('X-Frame-Options') && 
        nextConfigContent.includes('X-Content-Type-Options')) {
      console.log('✅ Headers de segurança configurados');
    } else {
      console.log('⚠️  Headers de segurança podem estar faltando');
      hasWarnings = true;
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar next.config.ts:', error.message);
    hasErrors = true;
  }
}

// Verificar dependências críticas
function checkDependencies() {
  console.log('\n📦 Verificando dependências críticas...');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const criticalDeps = [
      'next',
      'react',
      'prisma',
      '@prisma/client',
      'better-auth',
      'stripe',
      'zod'
    ];
    
    const missingDeps = criticalDeps.filter(dep => 
      !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );
    
    if (missingDeps.length > 0) {
      console.log('❌ Dependências críticas faltando:');
      missingDeps.forEach(dep => {
        console.log(`   - ${dep}`);
      });
      hasErrors = true;
    } else {
      console.log('✅ Todas as dependências críticas estão instaladas');
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar package.json:', error.message);
    hasErrors = true;
  }
}

// Verificar URL da aplicação
function checkAppUrl() {
  console.log('\n🌐 Verificando URL da aplicação...');
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (!appUrl) {
    console.log('❌ NEXT_PUBLIC_APP_URL não configurada');
    hasErrors = true;
    return;
  }
  
  if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
    console.log('⚠️  NEXT_PUBLIC_APP_URL aponta para localhost');
    console.log('   Para produção, use o domínio final');
    hasWarnings = true;
  } else if (appUrl.startsWith('https://')) {
    console.log('✅ URL da aplicação configurada corretamente');
  } else {
    console.log('⚠️  URL da aplicação deve usar HTTPS em produção');
    hasWarnings = true;
  }
}

// Função principal
async function main() {
  checkEnvironmentVariables();
  checkStripeConfig();
  checkRequiredFiles();
  checkNextConfig();
  checkDependencies();
  checkAppUrl();
  
  console.log('\n📋 RESUMO DA VALIDAÇÃO:');
  
  if (hasErrors) {
    console.log('❌ DEPLOY BLOQUEADO - Corrija os erros acima antes de fazer deploy');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  DEPLOY POSSÍVEL - Mas considere corrigir os avisos');
    console.log('✅ Nenhum erro crítico encontrado');
  } else {
    console.log('✅ SISTEMA PRONTO PARA DEPLOY!');
    console.log('🚀 Tudo configurado corretamente');
  }
  
  console.log('\n💡 Próximos passos:');
  console.log('1. Configure as variáveis de ambiente na Vercel');
  console.log('2. Execute: vercel --prod');
  console.log('3. Configure o webhook do Stripe para o domínio de produção');
  console.log('4. Teste todas as funcionalidades após o deploy');
}

// Executar se chamado diretamente
main().catch(console.error);