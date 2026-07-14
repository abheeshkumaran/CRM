# Super Admin Security System

## 🔐 Overview

The super admin account has **maximum security protection** with multiple layers:

1. **Role-based protection** - Only super admin can modify super admin
2. **Secret key requirement** - Special key needed for any super admin changes
3. **System lockdown** - Entire system stops if unauthorized access detected
4. **Audit logging** - All attempts are logged
5. **Integrity verification** - Checked on every server startup

## 🔑 Secret Key Setup

### Step 1: Generate Your Secret Key

Generate a strong, unique secret key (keep this EXTREMELY secure):

```bash
# Generate a random 64-character key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

### Step 2: Set Environment Variable

Add this to your Render environment variables:

```
SUPER_ADMIN_SECRET_KEY=your_generated_key_here
```

**CRITICAL:** 
- Never commit this key to Git
- Never share this key with anyone
- Store it in a secure password manager
- Only you should know this key

### Step 3: Restart Server

After setting the environment variable, restart your Render service.

## 🛡️ How to Make Super Admin Changes

### Option 1: Using API (Postman/cURL)

When making any request to modify super admin, include the secret key in headers:

```bash
curl -X PUT https://dad-backend.onrender.com/api/users/SUPER_ADMIN_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Super-Admin-Key: your_secret_key_here" \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Updated Name"}'
```

### Option 2: Using Frontend (Custom Implementation)

You'll need to modify the frontend to include the secret key header:

```typescript
// In your API service
const updateSuperAdmin = async (userId: string, data: any, secretKey: string) => {
    const response = await api.put(`/users/${userId}`, data, {
        headers: {
            'X-Super-Admin-Key': secretKey
        }
    });
    return response.data;
};
```

### Option 3: Using Browser Console (Quick Method)

```javascript
// In browser console while logged in as super admin
fetch('https://dad-backend.onrender.com/api/users/SUPER_ADMIN_ID', {
    method: 'PUT',
    headers: {
        'Authorization': 'Bearer ' + JSON.parse(localStorage.getItem('userInfo')).token,
        'X-Super-Admin-Key': 'your_secret_key_here',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        firstName: 'Updated Name'
    })
})
.then(r => r.json())
.then(console.log);
```

## 🚨 What Happens Without Secret Key

If someone tries to modify super admin without the secret key:

1. ❌ Request is immediately rejected
2. 🚨 System locks down completely
3. 📝 Security breach is logged
4. 🛑 All API requests return 503 error
5. ⚠️ Manual intervention required to unlock

## 🔍 Security Checks

The system performs these checks:

### On Every Request:
- ✅ Is system locked?
- ✅ Is target user super admin?
- ✅ Is secret key provided?
- ✅ Does secret key match?

### On Server Startup:
- ✅ Does super admin exist?
- ✅ Is role correct?
- ✅ Is organisation null?
- ✅ Is account active?

### On Password Change:
- ✅ Who is changing it?
- ✅ Is it super admin themselves?
- ✅ Log the change

## 📋 Protected Operations

These operations require the secret key when targeting super admin:

- ✅ Update user profile
- ✅ Change password
- ✅ Deactivate account
- ✅ Change role
- ✅ Assign to organisation
- ✅ Any user modification

## 🔓 How to Unlock System

If system gets locked (security breach detected):

1. **Check Render logs** for the security alert
2. **Identify the threat** - who tried to access?
3. **Fix the issue** - change passwords, revoke access
4. **Restart the server** - system unlocks on restart
5. **Verify integrity** - check super admin account

## 📊 Audit Trail

All security events are logged to `AuditLog` table:

```sql
SELECT * FROM "AuditLog" 
WHERE action LIKE '%SUPERADMIN%' 
OR action = 'SYSTEM_LOCKDOWN'
ORDER BY "createdAt" DESC;
```

## 🎯 Best Practices

1. **Keep secret key offline** - Write it down, store in password manager
2. **Never share** - Not even with team members
3. **Rotate periodically** - Change key every 90 days
4. **Monitor logs** - Check audit logs regularly
5. **Test in development** - Verify protection works
6. **Backup key** - Store in multiple secure locations

## ⚙️ Configuration

### Required Environment Variables:

```env
# CRITICAL: Super admin secret key (generate with crypto.randomBytes)
SUPER_ADMIN_SECRET_KEY=your_64_character_secret_key

# Optional: Hash of super admin ID for additional verification
SUPER_ADMIN_ID_HASH=sha256_hash_of_super_admin_id
```

### Optional: Additional Security

You can add IP whitelisting for super admin operations:

```typescript
// In superAdminProtection.ts
const ALLOWED_IPS = process.env.SUPER_ADMIN_ALLOWED_IPS?.split(',') || [];

if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(req.ip)) {
    lockSystem(`Super admin access from unauthorized IP: ${req.ip}`);
    return res.status(403).json({ message: 'IP not authorized' });
}
```

## 🆘 Emergency Procedures

### If Secret Key is Compromised:

1. **Immediately** generate new secret key
2. Update `SUPER_ADMIN_SECRET_KEY` in Render
3. Restart server
4. Change super admin password
5. Review audit logs for unauthorized access
6. Consider changing super admin email

### If System is Locked:

1. Check Render logs for lock reason
2. Investigate the security incident
3. Fix the vulnerability
4. Restart server (unlocks system)
5. Verify super admin integrity

### If Super Admin is Compromised:

1. System will auto-lock on tampering
2. Access database directly
3. Restore super admin from backup
4. Run seed script to recreate
5. Update all secrets

## 📞 Support

For security incidents:
1. Check Render logs immediately
2. Review audit trail in database
3. Document the incident
4. Take corrective action
5. Update security procedures

---

**Remember: The secret key is your master key. Protect it like your life depends on it!**
