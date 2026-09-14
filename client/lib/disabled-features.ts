/**
 * Features that are switched off in the product but kept in the tree.
 *
 * Nothing here is deleted on purpose. A deleted file that still exists on
 * another branch comes back on merge silently and with no conflict; a file
 * that is kept and modified conflicts loudly when the other branch touches
 * the same lines, so an accidental resurrection surfaces in review instead of
 * shipping unnoticed. Every disabled surface therefore keeps its component and
 * its route file, gated from here, with the call sites commented out in place.
 *
 * To re-enable one: flip its flag, then restore the commented blocks that
 * reference it (each carries a `DISABLED:` comment naming this file).
 */

/**
 * The `/setup` onboarding guide ("Get Set Up") — its route, its sidebar
 * section, and the card linking to it from the overview.
 *
 * Its work is now done inside Agent Configuration: the business type selector
 * on the persona page is where a merchant chooses what ORA is, which was the
 * guide's first and main step.
 *
 * The guide's components, its `/setup` route file and the `useSetupProgress`
 * hook are all deliberately kept and still wired up, even though nothing
 * renders them today: a short first-login setup flow is planned and will reuse
 * these pieces. Do not treat them as dead code to clean up.
 */
export const SETUP_GUIDE_ENABLED = false;

/**
 * The editorial "Get started" pages inside Agent Configuration, and the role
 * hub shown at `/agent` when no role is selected.
 *
 * These sat in front of every role as an extra click before the actual
 * feature. Roles now open straight onto the page that does the work.
 */
export const AGENT_GET_STARTED_ENABLED = false;

/**
 * The standalone "Test ORA" page inside Agent Configuration.
 *
 * It was a second route to one feature: the Test Voice button on the persona
 * page opens the same live call in a modal. The page's own blocks are kept and
 * gated rather than deleted.
 */
export const AGENT_TEST_PAGE_ENABLED = false;
