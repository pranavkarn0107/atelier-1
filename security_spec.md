# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Global Default Deny**: Any path not explicitly matched is denied for both `read` and `write`.
2. **Verified Authentication**: All writes and collaborator email checks require `request.auth != null && request.auth.token.email_verified == true`.
3. **Master Gate Relational Sync**: Every subcollection (`/collaborators`, `/tasks`, `/budgetItems`) fetches the parent `/events/{eventId}` document via `get()` and verifies that the caller is either the event `ownerId` or a verified collaborator whose email is present in `collaboratorEmails`.
4. **Immortal Ownership & Temporal Integrity**: `ownerId`, `ownerEmail`, `authorId`, `invitedByUid`, `eventId`, and `createdAt` are strictly immutable after document creation. `createdAt` and `updatedAt` must equal `request.time`.
5. **Bounded Collaborator List**: `collaboratorEmails` on `/events/{eventId}` is strictly bounded to `.size() <= 10` and validated on non-empty first element string type and length (`<= 160`).
6. **Terminal State Locking**: Once a `Task` reaches `status == 'completed'` or a `BudgetItem` reaches `paymentStatus == 'paid'`, only the parent Event Owner (`isEventOwner(eventId)`) can unlock or modify that terminal record.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Event Creation**: `ownerId: "victim-uid"` when `request.auth.uid == "attacker-uid"` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoofing**: `request.auth.token.email == "coplanner@example.com"` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Event Update**: Adding `{ "isVerifiedAdmin": true }` to `/events/{eventId}` -> `PERMISSION_DENIED` via `hasOnly()`.
4. **Ownership Hijack on Event Update**: Modifying `ownerId` or `ownerEmail` on `/events/{eventId}` -> `PERMISSION_DENIED`.
5. **Unbounded Collaborator Array Exhaustion**: Passing 15 emails in `collaboratorEmails` (`size() > 10`) -> `PERMISSION_DENIED`.
6. **ID Poisoning Attack**: Creating a document with a 500-character ID or special characters outside `^[a-zA-Z0-9_\-]+$` -> `PERMISSION_DENIED`.
7. **Orphaned Task Write**: Creating `/events/non-existent-id/tasks/tsk-1` where parent event does not exist -> `PERMISSION_DENIED`.
8. **Unauthorized Co-Planner Removal**: A non-owner collaborator attempting to delete the `/events/{eventId}` root document or modify `collaboratorEmails` -> `PERMISSION_DENIED`.
9. **Value Poisoning on Budget Item**: Updating `unitActual` with a string `"1000000"` or negative number `-500` -> `PERMISSION_DENIED`.
10. **Forged Client Timestamp**: Supplying a past or future `createdAt` or `updatedAt` != `request.time` -> `PERMISSION_DENIED`.
11. **Terminal State Mutation by Non-Owner**: A collaborator attempting to mutate a task after `resource.data.status == 'completed'` without owner privilege -> `PERMISSION_DENIED`.
12. **Blanket Collection Scraping**: Listing `/events` without filtering by `ownerId == request.auth.uid` or `request.auth.token.email in resource.data.collaboratorEmails` -> `PERMISSION_DENIED`.
