#!/usr/bin/env node

/**
 * Generate secure random secrets for JWT and NextAuth
 * 
 * Usage:
 *   node generate-secrets.js
 * 
 * This script generates cryptographically secure random strings
 * suitable for use as JWT_SECRET and NEXTAUTH_SECRET.
 */

import crypto from 'crypto';

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

console.log('🔐 Generating Secure Secrets\n');
console.log('Copy these values into your .env file:\n');

const jwtSecret = generateSecret(32);
const nextAuthSecret = generateSecret(32);

console.log(`JWT_SECRET="${jwtSecret}"`);
console.log(`NEXTAUTH_SECRET="${nextAuthSecret}"\n`);

console.log('✓ Secrets generated successfully');
console.log('\nTo use these:');
console.log('1. Copy the lines above');
console.log('2. Paste into .env file');
console.log('3. For Vercel, add these to Settings → Environment Variables');
console.log('4. Redeploy: vercel --prod\n');
