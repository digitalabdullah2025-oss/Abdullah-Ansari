# AF FIXING Security Specification & Invariants

## 1. Data Invariants
1. **Identity Integrity**: No user may create a `users/{uid}` document with `role == 'admin'` or `isBlocked == true`, nor escalate their own `role` or `isBlocked` via update.
2. **PII Isolation**: User emails, phones, and saved addresses in `users/{uid}` and KYC/phone details in `professionals/{proId}/private/{docId}` are strictly readable only by the owner and verified admins.
3. **Professional Verification Integrity**: Only verified admins may change `verificationStatus`, `isVerified`, or `isBlocked` on `professionals/{proId}`. Professionals cannot self-verify.
4. **Booking Referential & State Integrity**: A booking can only be created by an authenticated customer (`customerId == request.auth.uid`) against an existing `professionals/{professionalId}` document with initial status `'Request Sent'`. Once a booking reaches a terminal status (`Completed`, `Cancelled`, `Rejected`), non-admin writes are blocked (except setting `hasReview: true` by the customer after completion).
5. **Master Gate Chat Isolation**: Chat messages in `/bookings/{bookingId}/messages/{messageId}` are readable and writable only by the booking's `customerId`, `professionalId`, or an admin.
6. **Verified Reviews Only**: A review in `reviews/{reviewId}` can only be created by the booking's customer when the referenced booking exists and has `status == 'Completed'`.
7. **Secure List Queries**: All `list` rules on PII/private collections (`bookings`, `notifications`, `complaints`, `payments`) enforce `resource.data` ownership checks so unauthorized scraping is rejected by Firestore rules.
8. **Temporal Integrity**: `createdAt` and `updatedAt` timestamps on validated writes match `request.time` and `createdAt` is immutable on update.

## 2. Dirty Dozen Payloads (Must Return PERMISSION_DENIED)
1. **Self-Admin Escalation**: Creating `/users/attacker1` with `{ uid: "attacker1", role: "admin", isBlocked: false }`.
2. **Role Tampering Update**: Updating own `/users/user1` document to change `role` from `"customer"` to `"admin"`.
3. **Self-Verification Attack**: Creating `/professionals/pro1` with `{ isVerified: true, verificationStatus: "verified" }`.
4. **Shadow Ghost Field Injection**: Updating `/professionals/pro1` with `{ isOnline: true, isVerified: true }` (professional attempting to flip `isVerified`).
5. **PII Cross-Read**: User A attempting `get` on `/users/userB` or `/professionals/pro1/private/verification`.
6. **Blanket Booking Scrape**: User A attempting `list` on `/bookings` without filtering `customerId == userA` or `professionalId == userA`.
7. **Booking Status Shortcutting by Customer**: Customer attempting to update `/bookings/b1` status directly to `"Completed"` or `"Accepted"`.
8. **Terminal State Mutation**: Professional attempting to mutate `/bookings/b1` after `status == "Completed"`.
9. **Orphaned Booking Creation**: Customer attempting to create `/bookings/b2` referencing a non-existent `professionalId`.
10. **Fake Review Injection**: User creating `/reviews/r1` for a booking whose status is `"Request Sent"` (not `"Completed"`) or belongs to another customer.
11. **Chat Eavesdropping / Spoofing**: Third-party User C reading or posting to `/bookings/b1/messages/m1`.
12. **Catalog Price Tampering**: Non-admin user attempting to write `/pricingItems/ac-gas` or `/serviceCategories/ac-repair`.
