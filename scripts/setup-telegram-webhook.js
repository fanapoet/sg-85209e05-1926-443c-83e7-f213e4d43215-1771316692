/**
 * Telegram Webhook Setup Script
 * Run this once to register the webhook with Telegram Bot API
 * 
 * Usage: node scripts/setup-telegram-webhook.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    }
  });
  
  return envVars;
}

const env = loadEnv();
const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = `${env.NEXT_PUBLIC_SITE_URL}/api/telegram-webhook`;

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not found in .env.local');
  process.exit(1);
}

if (!env.NEXT_PUBLIC_SITE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SITE_URL not found in .env.local');
  process.exit(1);
}

console.log('🚀 Setting up Telegram webhook...\n');
console.log(`📍 Webhook URL: ${WEBHOOK_URL}\n`);

/**
 * Register webhook with Telegram
 */
function setWebhook() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      url: WEBHOOK_URL,
      allowed_updates: ['pre_checkout_query', 'message']
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/setWebhook`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.ok) {
            resolve(result);
          } else {
            reject(new Error(result.description || 'Unknown error'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Get webhook info to verify
 */
function getWebhookInfo() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/getWebhookInfo`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.ok) {
            resolve(result.result);
          } else {
            reject(new Error(result.description || 'Unknown error'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Set webhook
    console.log('📡 Registering webhook...');
    const setResult = await setWebhook();
    console.log('✅ Webhook registered successfully!');
    console.log(`   Response: ${setResult.description || 'OK'}\n`);

    // Step 2: Verify webhook
    console.log('🔍 Verifying webhook...');
    const info = await getWebhookInfo();
    
    console.log('✅ Webhook verified!\n');
    console.log('📋 Webhook Info:');
    console.log(`   URL: ${info.url}`);
    console.log(`   Pending Updates: ${info.pending_update_count}`);
    console.log(`   Allowed Updates: ${info.allowed_updates?.join(', ') || 'all'}`);
    console.log(`   Last Error: ${info.last_error_message || 'None'}`);
    
    if (info.last_error_date) {
      const errorDate = new Date(info.last_error_date * 1000);
      console.log(`   Last Error Date: ${errorDate.toISOString()}`);
    }

    console.log('\n🎉 Setup complete! Your Telegram webhook is now active.\n');
    console.log('💡 Next steps:');
    console.log('   1. Deploy Edge Function to Supabase');
    console.log('   2. Add environment variables to Vercel');
    console.log('   3. Test payments in Telegram app\n');

  } catch (error) {
    console.error('\n❌ Error setting up webhook:');
    console.error(`   ${error.message}\n`);
    console.error('🔧 Troubleshooting:');
    console.error('   1. Check your TELEGRAM_BOT_TOKEN in .env.local');
    console.error('   2. Make sure NEXT_PUBLIC_SITE_URL is correct');
    console.error('   3. Ensure your webhook URL is HTTPS');
    console.error('   4. Check if your domain is accessible from Telegram servers\n');
    process.exit(1);
  }
}

main();