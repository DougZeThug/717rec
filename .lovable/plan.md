# Join sign-up tracking

## Goal
Count completed league sign-up requests from the Join page in existing Google Analytics, separate from clicks.

## Steps
1. Carry a Join source tag into each sign-up form link.
2. Send a `join_league_signup` event only after a valid league request succeeds, with source and solo/team mode. Send no names, contact details or message text.
3. Keep existing contact events. Ignore honeypot submissions and isolate tracking failures from the saved request.
4. Add focused tests and review the public Join-to-form path.

## Impact and verification
No database, dependencies, scoring or historical changes. No hand-apply step. Counts are requests, not unique players or paid registrations. Existing Google Analytics Events reports show totals; new source tags cannot identify earlier requests. Test success, failure, source and mode. Rollback removes the new event helper and source tags.