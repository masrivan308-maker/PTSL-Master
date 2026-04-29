# Security Specification for Master Data

## Data Invariants
1. `NIK` must be unique and valid (16 digits typically, but I'll use a more flexible regex).
2. `NOP` must be unique and valid.
3. Every record must have an `updatedAt` timestamp.
4. Users must be authenticated to read or write master data (unless otherwise specified, but for a management app, authentication is expected).
5. No one can delete records in bulk unless they are an admin (for the "Empty Data" feature, I'll implement a helper).

## The Dirty Dozen Payloads (Rejection Targets)
1. **Invalid ID**: `master_warga/!!!invalid!!!` (Special chars in ID)
2. **Missing Required Field**: `master_warga/1234` with `{ NAMA: "Test" }` (Missing NIK in data)
3. **Identity Spoofing**: `master_warga/USER_A` but payload says `NIK: "USER_B"`
4. **Ghost Field Injection**: Adding `is_admin: true` to a warga document.
5. **Type Poisoning**: `LUAS_SPPT: "one million"` (String instead of Number)
6. **Large Document Attack**: `NAMA: "A".repeat(2000000)` (Exceeding field size limits)
7. **Temporal Fraud**: `updatedAt: "2000-01-01"` (Client-provided old timestamp)
8. **Relational Breakage**: `sppt` without `NAMA_WAJIB_PAJAK`.
9. **Unauthenticated Read**: Attempting to list all warga without being logged in.
10. **Malicious Update**: Changing `NIK` of an existing document.
11. **Shadow Write**: Writing to a collection not defined in the blueprint (e.g., `super_secrets`).
12. **PII Leak**: Listing users without specific filters if restricted.

## Test Runner (firestore.rules.test.ts)
I will provide a test file to verify these assertions.
