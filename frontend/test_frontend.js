#!/usr/bin/env node
/**
 * Автоматическая проверка работоспособности фронтенда
 * проекта "Цифровое месторождение".
 *
 * Запуск из папки frontend/:
 *   node test_frontend.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;

function ok(msg) {
  console.log(`  \u2705 ${msg}`);
}

function fail(msg) {
  console.log(`  \u274C ${msg}`);
}

// ---------------------------------------------------------------------------
// ТЕСТ 1: Сборка проекта
// ---------------------------------------------------------------------------
function testBuild() {
  console.log('\n[2/2] Проверка сборки проекта (npm run build)...');

  let passed = true;
  try {
    execSync('npm run build', {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 300000,
    });
    ok('npm run build завершился успешно (exit code 0)');
  } catch (e) {
    fail(`npm run build завершился с ошибкой: ${e.message.split('\n')[0]}`);
    return false;
  }

  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(distDir) && fs.statSync(distDir).isDirectory()) {
    const files = fs.readdirSync(distDir);
    ok(`Папка dist/ создана, содержит файлов/папок: ${files.length}`);
  } else {
    fail('Папка dist/ не найдена после сборки');
    passed = false;
  }

  return passed;
}

// ---------------------------------------------------------------------------
// ТЕСТ 2: Зависимости
// ---------------------------------------------------------------------------
function testDependencies() {
  console.log('\n[1/2] Проверка зависимостей в package.json...');

  let passed = true;
  const pkgPath = path.join(ROOT, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    fail('Файл package.json не найден');
    return false;
  }
  ok('package.json существует');

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (e) {
    fail(`Не удалось разобрать package.json: ${e.message}`);
    return false;
  }

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const required = ['react', 'react-dom', 'react-router-dom', 'axios', 'recharts'];

  for (const name of required) {
    if (deps[name]) {
      ok(`Зависимость '${name}' объявлена (${deps[name]})`);
    } else {
      fail(`Зависимость '${name}' отсутствует в package.json`);
      passed = false;
    }
  }

  // Проверка, что пакеты реально установлены в node_modules
  const nm = path.join(ROOT, 'node_modules');
  if (!fs.existsSync(nm)) {
    fail('Папка node_modules не найдена — выполните npm install');
    passed = false;
  } else {
    const missingInstalled = required.filter((n) => !fs.existsSync(path.join(nm, n)));
    if (missingInstalled.length === 0) {
      ok('Все основные зависимости установлены в node_modules');
    } else {
      fail(`Не установлены в node_modules: ${missingInstalled.join(', ')}`);
      passed = false;
    }
  }

  return passed;
}

// ---------------------------------------------------------------------------
// Итоговый отчёт
// ---------------------------------------------------------------------------
function runAllTests() {
  console.log('====================');
  console.log('ПРОВЕРКА ФРОНТЕНДА');
  console.log('====================');

  const results = {
    'Зависимости установлены': testDependencies(),
    'Сборка проекта': testBuild(),
  };

  console.log('\n====================');
  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    const icon = passed ? '\u2705' : '\u274C';
    const status = passed ? 'OK' : 'ПРОВАЛЕН';
    console.log(`${icon} ${name}: ${status}`);
    if (!passed) allPassed = false;
  }
  console.log('====================');
  console.log(allPassed ? '\u{1F389} ФРОНТЕНД РАБОТАЕТ КОРРЕКТНО' : '\u26A0\uFE0F  ОБНАРУЖЕНЫ ПРОБЛЕМЫ');

  process.exit(allPassed ? 0 : 1);
}

runAllTests();
