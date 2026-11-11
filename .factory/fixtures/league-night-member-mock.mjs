// FAKE DATA ONLY. League-night mock signed in as "Fake Player 1A", an approved member of Fake Team Bravo.
// Same data as league-night-mock.mjs (its header lists what is served). The member can score the live match ID(1000).
import { createMock, init, initArgFor } from './league-night/handler.mjs';
import { MEMBER } from './league-night/data.mjs';

export { init };
export const initArg = initArgFor(MEMBER);
export default createMock(MEMBER);
