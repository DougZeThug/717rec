// FAKE DATA ONLY. League-night mock signed in as "Fake Admin Person" (profiles.is_admin = true), for /admin/<section>.
// Same data as league-night-mock.mjs (its header lists what is served).
import { createMock, init, initArgFor } from './league-night/handler.mjs';
import { ADMIN } from './league-night/data.mjs';

export { init };
export const initArg = initArgFor(ADMIN);
export default createMock(ADMIN);
