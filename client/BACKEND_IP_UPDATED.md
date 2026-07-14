# Backend IP Address Updated

## Change Summary

The EC2 instance IP address has been updated in the deployment configuration:

- **Old IP:** `13.235.33.148`
- **New IP:** `13.233.83.130`

## Status

✅ Backend configuration finalized (13.233.83.130)
✅ pypecrm.com pointing to new IP
✅ Deployment script updated with local SSH key
✅ `.env.mumbai` updated with new IP

## If You See 502 Errors

The backend is working fine. If you see 502 errors:

1. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

2. **Clear DNS cache (macOS):**
   ```bash
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   ```

3. **Restart browser** and try again in incognito mode

## Why This Happened

The EC2 instance was restarted without an Elastic IP, causing the IP to change. To prevent this:

1. Allocate an Elastic IP in AWS Console
2. Associate it with the EC2 instance
3. Update DNS to point to the Elastic IP

Elastic IPs remain constant even when instances are stopped/started.
