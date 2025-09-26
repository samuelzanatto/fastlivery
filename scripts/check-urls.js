#!/usr/bin/env node

/**
 * Script para encontrar URLs hardcoded no código
 * Identifica URLs que podem causar problemas em produção
 */

import fs from 'fs';
import path from 'path';

const results = [];

// Padrões problemáticos
const patterns = {
  // URLs absolutas problemáticas (ERRO)
  hardcodedUrls: /https?:\/\/(?:localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.ngrok\.io)[^\s"'`)]*/g,
  
  // URLs de exemplo ou placeholder (WARNING)
  exampleUrls: /https?:\/\/(?:example\.com|your-domain\.com|seusite\.com)/g,
  
  // URLs de produção específicas (WARNING)
  specificUrls: /https?:\/\/fastlivery\.vercel\.app/g,
  
  // Uso correto de variáveis de ambiente (INFO)
  envUrls: /process\.env\.(?:NEXT_PUBLIC_APP_URL|NGROK_URL)/g
};

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Verificar URLs hardcoded problemáticas
      const hardcodedMatches = line.match(patterns.hardcodedUrls);
      if (hardcodedMatches) {
        hardcodedMatches.forEach(url => {
          // Pular se for dentro de uma string de exemplo ou comentário
          if (line.includes('//') && line.indexOf('//') < line.indexOf(url)) return;
          if (line.includes('*') && line.indexOf('*') < line.indexOf(url)) return;
          // Pular URLs no helper centralizado (aceitáveis)
          if (filePath.includes('/lib/utils/urls.ts')) return;
          
          results.push({
            file: filePath,
            line: lineNumber,
            content: line.trim(),
            url,
            severity: 'error',
            suggestion: `Substituir por process.env.NEXT_PUBLIC_APP_URL ou usar helper getAppUrl()`
          });
        });
      }
      
      // Verificar URLs de exemplo
      const exampleMatches = line.match(patterns.exampleUrls);
      if (exampleMatches) {
        exampleMatches.forEach(url => {
          results.push({
            file: filePath,
            line: lineNumber,
            content: line.trim(),
            url,
            severity: 'warning',
            suggestion: 'URL de placeholder/exemplo - OK se for apenas documentação'
          });
        });
      }
      
      // Verificar URLs específicas da aplicação
      const specificMatches = line.match(patterns.specificUrls);
      if (specificMatches) {
        specificMatches.forEach(url => {
          results.push({
            file: filePath,
            line: lineNumber,
            content: line.trim(),
            url,
            severity: 'warning',
            suggestion: 'URL específica hardcoded - considere usar variável de ambiente'
          });
        });
      }
    });
  } catch (error) {
    console.error(`Erro ao analisar ${filePath}:`, error);
  }
}

function scanDirectory(dirPath, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Pular diretórios desnecessários
      if (['node_modules', '.next', '.git', 'dist', 'build'].includes(item)) {
        continue;
      }
      scanDirectory(fullPath, extensions);
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath);
      if (extensions.includes(ext)) {
        analyzeFile(fullPath);
      }
    }
  }
}

function generateReport() {
  console.log('🔍 Verificando URLs hardcoded no código...\n');
  
  // Escanear diretórios principais
  const dirsToScan = ['src', 'middleware.ts', 'next.config.ts'];
  
  dirsToScan.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
        scanDirectory(fullPath);
      } else {
        analyzeFile(fullPath);
      }
    }
  });
  
  // Agrupar resultados por severidade
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const infos = results.filter(r => r.severity === 'info');
  
  // Relatório de erros
  if (errors.length > 0) {
    console.log('❌ URLS HARDCODED PROBLEMÁTICAS (devem ser corrigidas):');
    errors.forEach(result => {
      console.log(`\n  📁 ${result.file}:${result.line}`);
      console.log(`  🔗 URL encontrada: ${result.url}`);
      console.log(`  📝 Linha: ${result.content}`);
      if (result.suggestion) {
        console.log(`  💡 Sugestão: ${result.suggestion}`);
      }
    });
  }
  
  // Relatório de warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  URLS QUE MERECEM ATENÇÃO:');
    warnings.forEach(result => {
      console.log(`\n  📁 ${result.file}:${result.line}`);
      console.log(`  🔗 URL encontrada: ${result.url}`);
      console.log(`  📝 Linha: ${result.content}`);
      if (result.suggestion) {
        console.log(`  💡 Sugestão: ${result.suggestion}`);
      }
    });
  }
  
  // Resumo final
  console.log('\n📊 RESUMO:');
  console.log(`❌ Erros críticos: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`ℹ️  Informações: ${infos.length}`);
  
  if (errors.length === 0) {
    console.log('\n✅ Nenhuma URL hardcoded crítica encontrada!');
  } else {
    console.log('\n🔧 AÇÕES RECOMENDADAS:');
    console.log('1. Substituir URLs hardcoded por variáveis de ambiente');
    console.log('2. Usar o helper getAppUrl() criado em /lib/utils/urls.ts');
    console.log('3. Configurar NEXT_PUBLIC_APP_URL corretamente');
    console.log('4. Testar em ambiente de produção após correções');
  }
  
  return errors.length === 0;
}

// Executar análise
const success = generateReport();
process.exit(success ? 0 : 1);