#!/usr/bin/env node

/**
 * Configuration Validation Script
 * 
 * Checks if all required environment variables and configurations are set up correctly.
 * 
 * Usage:
 *   node validate-config.js
 * 
 * Run this before deploying to catch configuration issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.success = [];
  }

  check(condition, message, level = 'error') {
    if (!condition) {
      if (level === 'error') {
        this.issues.push(message);
      } else {
        this.warnings.push(message);
      }
    } else {
      this.success.push(message);
    }
  }

  printResults() {
    console.log('\n📋 Configuration Validation Report\n');
    console.log('═'.repeat(50));

    if (this.success.length > 0) {
      console.log('\n✅ Good Configurations:');
      this.success.forEach(msg => console.log(`   ✓ ${msg}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(msg => console.log(`   ⚠ ${msg}`));
    }

    if (this.issues.length > 0) {
      console.log('\n❌ Configuration Issues:');
      this.issues.forEach(msg => console.log(`   ✗ ${msg}`));
    }

    console.log('\n' + '═'.repeat(50));

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('\n✨ All systems go! Ready for deployment.\n');
      return true;
    } else if (this.issues.length === 0) {
      console.log('\n⚠️  Some warnings but you can proceed.\n');
      return true;
    } else {
      console.log('\n❌ Fix the issues above before deploying.\n');
      return false;
    }
  }
}

const validator = new ConfigValidator();

// Load environment variables
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

let envContent = '';
let envExampleContent = '';

try {
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  if (fs.existsSync(envExamplePath)) {
    envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
  }
} catch (error) {
  console.error('Error reading .env files:', error.message);
  process.exit(1);
}

// Parse env variables
function parseEnv(content) {
  const env = {};
  const lines = content.split('\n');
  lines.forEach(line => {
    const match = line.match(/^([A-Z_]+)="?([^"]*)"?/);
    if (match && match[1] && !match[1].startsWith('#')) {
      env[match[1]] = match[2];
    }
  });
  return env;
}

const env = parseEnv(envContent);
const envExample = parseEnv(envExampleContent);

console.log('\n🔍 Validating Configuration...\n');

// Check for .env file
validator.check(
  fs.existsSync(envPath),
  '.env file exists',
  'warning'
);

// Check required variables
const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET', 'NEXTAUTH_SECRET'];
const configured = required.filter(key => env[key] && env[key].trim() && !env[key].includes('your-'));

required.forEach(key => {
  const value = env[key];
  const isSet = value && value.trim() && !value.includes('your-') && !value.includes('YOUR_');
  const isValid = key === 'GOOGLE_CLIENT_ID' ? 
    isSet && value.includes('.apps.googleusercontent.com') : 
    isSet;
  
  validator.check(
    isValid,
    `${key} is configured properly`,
    'error'
  );
});

// Check optional variables
validator.check(
  env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes('YOUR_'),
  'GEMINI_API_KEY is set (optional, but AI features won\'t work without it)',
  'warning'
);

validator.check(
  env.BLOB_READ_WRITE_TOKEN && env.BLOB_READ_WRITE_TOKEN.trim(),
  'BLOB_READ_WRITE_TOKEN is set (optional, but large files won\'t work without it)',
  'warning'
);

// Check APP_URL
const appUrl = env.APP_URL || '';
const isProduction = appUrl.includes('vercel.app') || appUrl.includes('vercel.com') || 
                    (appUrl.includes('https://') && !appUrl.includes('localhost'));
validator.check(
  appUrl && appUrl.trim(),
  `APP_URL is set (${isProduction ? 'production' : 'development'})`,
  'error'
);

// Check for .env.example
validator.check(
  fs.existsSync(envExamplePath),
  '.env.example file exists (good for documentation)',
  'warning'
);

// Check for vercel.json
const vercelJsonPath = path.join(__dirname, 'vercel.json');
validator.check(
  fs.existsSync(vercelJsonPath),
  'vercel.json is present for Vercel deployment',
  'warning'
);

// Check for package.json
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  validator.check(
    packageJson.dependencies && packageJson.dependencies['@vercel/blob'],
    '@vercel/blob dependency is installed',
    'warning'
  );
}

// Check git status
const gitPath = path.join(__dirname, '.git');
validator.check(
  fs.existsSync(gitPath),
  'Git repository initialized',
  'warning'
);

// Print results
const isValid = validator.printResults();

// Exit with appropriate code
process.exit(isValid ? 0 : 1);
