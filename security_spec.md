# Daylight — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Zero Public Access**: Unauthenticated visitors (`request.auth == null`) cannot read, list, create, update, or delete any document in the database.
2. **Verified Email Requirement**: Every standard read or write operation requires `request.auth.token.email_verified == true`.
3. **Strict Tenant Isolation**: A user can only read or write documents under `/users/{userId}` and `/users/{userId}/dailyRecords/{date}` when `request.auth.uid == userId` AND the document payload/resource `uid == request.auth.uid`.
4. **No User Enumeration**: Listing `/users` is unconditionally denied (`allow list: if false`).
5. **Master Gate Relational Sync**: Every single-document operation (`get`, `create`, `update`, `delete`) on `/users/{userId}/dailyRecords/{date}` verifies via `get()` that the parent `/users/{userId}` document exists and belongs to `request.auth.uid`.
6. **Query Enforcer on Daily Record Lists**: `allow list` on `/users/{userId}/dailyRecords` enforces `request.auth.uid == userId && resource.data.uid == request.auth.uid` without `get()`/`exists()` N+1 read amplification.
7. **Strict Schema & Shadow-Field Blocking**: `UserProfile` and `DailyRecord` enforce `hasAll` and `hasOnly` on creation, and `isValid[Entity]` + `affectedKeys().hasOnly(...)` on every action-based update.
8. **Immutable Ownership & Temporal Integrity**: `uid`, `date`, and `createdAt` cannot be mutated after creation. `createdAt` (on create) and `updatedAt` (on create and update) must strictly equal `request.time`.
9. **Volumetric & Array Boundaries**: `goals` array is capped at `<= 50` items, `goal.text` is `1..280` chars, `reflection` is `<= 5000` chars, `totalGoals == goals.size()`, and `0 <= completedGoals <= totalGoals`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

All 12 payloads below MUST return `PERMISSION_DENIED`:

1. **Unauthenticated Profile Creation** (`auth = null` writing to `/users/user_1`):
   ```json
   { "uid": "user_1", "displayName": "Anon", "theme": "light", "streakRule": "any_completed", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
2. **Unverified Email Spoof Write** (`auth.uid = "user_1"`, `email_verified = false` writing to `/users/user_1`):
   ```json
   { "uid": "user_1", "displayName": "Spoof", "theme": "light", "streakRule": "any_completed", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
3. **Cross-Tenant Profile Read/Write** (`auth.uid = "attacker_99"` writing/reading `/users/victim_1`):
   ```json
   { "uid": "victim_1", "displayName": "Hacked", "theme": "dark", "streakRule": "any_completed", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
4. **Shadow Field Injection on Profile** (`isAdmin: true` ghost key on `/users/user_1`):
   ```json
   { "uid": "user_1", "displayName": "Alice", "theme": "light", "streakRule": "any_completed", "isAdmin": true, "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
5. **Invalid Enum Poisoning on Profile** (`theme: "neon-cyberpunk"` on `/users/user_1`):
   ```json
   { "uid": "user_1", "displayName": "Alice", "theme": "neon-cyberpunk", "streakRule": "any_completed", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
6. **Orphaned DailyRecord Without Parent UserProfile** (`auth.uid = "orphan_user"` writing `/users/orphan_user/dailyRecords/2026-10-25` when `/users/orphan_user` does not exist):
   ```json
   { "uid": "orphan_user", "date": "2026-10-25", "goals": [], "totalGoals": 0, "completedGoals": 0, "reflection": "", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
7. **Invalid Date Path / Payload Mismatch** (`date` path is `2026-10-25` while payload `date` is `2026-10-26`, or path is `not-a-date`):
   ```json
   { "uid": "user_1", "date": "2026-10-26", "goals": [], "totalGoals": 0, "completedGoals": 0, "reflection": "", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
8. **Forged Client Timestamp** (`createdAt` or `updatedAt` set to past/future client `Timestamp` instead of `serverTimestamp()`):
   ```json
   { "uid": "user_1", "date": "2026-10-25", "goals": [], "totalGoals": 0, "completedGoals": 0, "reflection": "", "createdAt": "2020-01-01T00:00:00Z", "updatedAt": "2020-01-01T00:00:00Z" }
   ```
9. **Immutable Ownership / CreatedAt Mutation on Update** (updating `uid` or `createdAt` on an existing `DailyRecord`):
   ```json
   { "uid": "user_2", "date": "2026-10-25", "goals": [], "totalGoals": 0, "completedGoals": 0, "reflection": "mutated owner", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
10. **Denial-of-Wallet Oversized Reflection String** (`reflection` length > 5000 chars):
    ```json
    { "uid": "user_1", "date": "2026-10-25", "goals": [], "totalGoals": 0, "completedGoals": 0, "reflection": "<6000-character string>", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
    ```
11. **Metric Desync / Impossible Completion Count** (`completedGoals: 5` when `totalGoals: 1` or `totalGoals != goals.size()`):
    ```json
    { "uid": "user_1", "date": "2026-10-25", "goals": [], "totalGoals": 0, "completedGoals": 5, "reflection": "", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
    ```
12. **Malformed Goal Item Schema Inside `goals` Array** (`goals[0]` missing required fields or `text` > 280 chars or extra ghost field):
    ```json
    { "uid": "user_1", "date": "2026-10-25", "goals": [{ "id": "g1", "text": "", "completed": "yes" }], "totalGoals": 1, "completedGoals": 0, "reflection": "", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
    ```
