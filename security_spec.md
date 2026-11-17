# Security Specification (Firestore Rules)

## 1. Data Invariants
1. Every document ID across `config`, `roster`, `prizes`, `registrations`, and `luckyWinners` must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
2. Every write operation is strictly schema-validated via standalone `isValid*` helper functions enforcing allowed/required keys (`hasAll` and `hasOnly`), field types, numeric bounds (`remaining >= 0 && remaining <= quantity`), and string/array `.size()` bounds.
3. No document may accept shadow/ghost fields outside the declared `firebase-blueprint.json` entities.
4. `luckyWinners` records omit attendee phone numbers so stage/live feeds never expose phone PII.
5. `test/connection` supports read-only connectivity verification on app boot.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Ghost Field in Config**: Writing `{ eventName: "Party", isAdmin: true, ... }` to `/config/main` -> rejected by `keys().hasOnly(...)`.
2. **Oversized Event Name**: Writing `eventName` > 200 chars -> rejected by `.size() <= 200`.
3. **Unbounded Blocked Groups Array**: Writing `blockedGroups` with > 50 elements -> rejected by `.size() <= 50`.
4. **Negative Prize Inventory**: Writing `/prizes/PRIZE-01` with `remaining: -1` -> rejected by `remaining >= 0`.
5. **Remaining Exceeds Quantity**: Writing `/prizes/PRIZE-01` with `quantity: 1, remaining: 5` -> rejected by `remaining <= quantity`.
6. **Oversized Selfie / Image Payload**: Writing `selfieUrl` > 450,000 chars -> rejected by `.size() <= 450000`.
7. **Missing Phone on Registration**: Writing `/registrations/REG-1` without `phone` -> rejected by `hasAll(...)`.
8. **Invalid Document ID Injection**: Writing `/registrations/bad..id$foo` -> rejected by `isValidId()`.
9. **Wrong Type on `isRegistrationOpen`**: Writing `isRegistrationOpen: "true"` (string) -> rejected by `is bool`.
10. **Missing Prize Reference on Winner**: Creating `/luckyWinners/WIN-1` with non-existent `prizeId` -> rejected by `exists(/databases/$(database)/documents/prizes/$(incoming().prizeId))`.
11. **Zero/Negative Round Number**: Writing `/luckyWinners/WIN-1` with `round: 0` -> rejected by `round >= 1`.
12. **Unrecognized Collection Write**: Writing to `/admins/hacker` or `/arbitrary/doc` -> rejected by global catch-all `match /{document=**} { allow read, write: if false; }`.
