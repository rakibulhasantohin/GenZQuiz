# Security Specification - Quiz Battle App

## 1. Data Invariants
- A **Battle** must have a creator and a category.
- A **Battle** stake must be a non-negative integer.
- A **Battle** status progresses: `waiting` -> `active` -> `completed`.
- **Battle Messages** must belong to an existing battle and be sent by a participant (or the creator on behalf of a bot).
- **User Profiles** can only be updated by the owner or an admin.
- **Leaderboard** entries are synced with user profiles.
- **Mistakes** are private to the user.

## 2. Participating Entities
- **User**: Standard authenticated user.
- **Admin**: User with specific email addresses (rakibulhasantohin@gmail.com, rakibulhasantuhin010@gmail.com).
- **Bot**: Virtual participant (senderId: 'bot-id') managed by the battle creator.

## 3. The "Dirty Dozen" Payloads (Red Team Tests)
1. **Identity Spoofing**: Attempt to create a battle with someone else's `creatorId`.
2. **State Shortcut**: Attempt to update battle status from `waiting` directly to `completed`.
3. **Ghost Field Injection**: Adding `isVerified: true` to a user profile update.
4. **Reward Theft**: Attempt to award prize coins to self in a battle you didn't win.
5. **Bot Impersonation**: Attempt to send a message as `bot-id` in a battle where you are not the creator.
6. **Price Tampering**: Attempt to join a battle while ignoring the high stake (skipping coin deduction).
7. **Score Overwrite**: Attempt to change the opponent's score in an active battle (if not a bot battle).
8. **Resource Exhaustion**: Sending a message with 1MB of text.
9. **Unauthorized List**: Attempt to list all `quiz_sessions` of another user.
10. **ID Poisoning**: Creating a message with a document ID that is 2KB long.
11. **Stake Modification**: Changing the stake of a battle after it has started.
12. **Double Prize Claim**: Attempt to set `creatorPrizeAwarded` to `true` multiple times or when not applicable.

## 4. Test Runner Plan
I will implement `firestore.rules.test.ts` (conceptual or actual if environment allows) to verify these constraints. Since I cannot run a full test suite with local emulator here easily, I will perform a manual "Red Team" audit as per Phase 5.
