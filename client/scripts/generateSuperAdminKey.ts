import crypto from 'crypto';

console.log('\n🔐 Super Admin Secret Key Generator\n');
console.log('═'.repeat(60));

// Generate a secure random key
const secretKey = crypto.randomBytes(32).toString('hex');

console.log('\n✅ Your Super Admin Secret Key:\n');
console.log(`   ${secretKey}`);
console.log('\n' + '═'.repeat(60));

console.log('\n📋 Setup Instructions:\n');
console.log('1. Copy the key above');
console.log('2. Go to Render Dashboard → Your Service → Environment');
console.log('3. Add new environment variable:');
console.log('   Name:  SUPER_ADMIN_SECRET_KEY');
console.log(`   Value: ${secretKey}`);
console.log('4. Save and restart your service');
console.log('\n⚠️  CRITICAL SECURITY:');
console.log('   - Never commit this key to Git');
console.log('   - Never share this key with anyone');
console.log('   - Store it in a secure password manager');
console.log('   - Only YOU should know this key');
console.log('\n💡 Usage:');
console.log('   When making super admin changes, include this header:');
console.log(`   X-Super-Admin-Key: ${secretKey}`);
console.log('\n' + '═'.repeat(60) + '\n');
