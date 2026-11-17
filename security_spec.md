# Security Specification — RouterMaster Wi-Fi Control Center

## 1. Data Invariants
1. **Strict Ownership**: Every `userSettings/{userId}` document can only be read or written by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Router Isolation**: Every `routers/{routerId}` document must have `ownerId == request.auth.uid` on creation, and `ownerId` is immutable on updates.
3. **Subcollection Master Gate**: Every document in `subscribers`, `devices`, and `alerts` under `routers/{routerId}` must belong to an existing parent router owned by `request.auth.uid`, with `routerId == routerId` and `ownerId == request.auth.uid` immutable.
4. **Server Temporal Integrity**: `createdAt` must equal `request.time` on create and remain unchanged on update. `updatedAt` must equal `request.time` on create and update.
5. **No Shadow Fields / Type Safety**: Strict `keys().hasAll(...) && keys().hasOnly(...)` on creation and `affectedKeys().hasOnly(...)` on action-based updates, paired with strict `.size()`, numeric bounds, enum allowlists, and MAC/ID regex validation.
6. **Zero PII in Firestore**: No emails, phone numbers, or home addresses are stored in Firestore documents.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Router Read**: `get(/routers/r1)` when `request.auth == null`.
2. **Identity Spoofing on Router Create**: `create(/routers/r1, { ownerId: "other-uid", ... })` when `request.auth.uid == "user-1"`.
3. **Unverified Email Write**: `create(/routers/r1, { ownerId: "user-1", ... })` when `request.auth.token.email_verified == false`.
4. **Ghost Field / Shadow Update**: `update(/routers/r1, { isAdmin: true, updatedAt: request.time })`.
5. **Immutable Owner Tampering**: `update(/routers/r1, { ownerId: "attacker", updatedAt: request.time })`.
6. **Client-Forged Timestamp**: `create(/routers/r1, { createdAt: "2020-01-01T00:00:00Z", ... })` instead of `request.time`.
7. **ID Poisoning Attack**: `create(/routers/invalid$$id_with_spaces_or_1kb_payload, ...)` failing `isValidId()`.
8. **Orphaned Subcollection Write**: `create(/routers/nonexistent/devices/d1, { ownerId: "user-1", routerId: "nonexistent", ... })` failing `exists()` / `get()` Master Gate.
9. **Cross-Tenant Device Injection**: `create(/routers/victimRouter/devices/d1, { ownerId: "attacker", routerId: "victimRouter", ... })` failing parent `ownerId == request.auth.uid`.
10. **Invalid MAC Address Poisoning**: `create(/routers/r1/devices/d1, { macAddress: "INVALID-MAC-99999999999", ... })` failing regex.
11. **Negative / Out-of-Range Quota**: `update(/routers/r1/subscribers/s1, { quotaLimitGb: -500, updatedAt: request.time })`.
12. **Blanket List Query Scraping**: `list(/routers)` without `where('ownerId', '==', request.auth.uid)` failing `resource.data.ownerId == request.auth.uid`.
