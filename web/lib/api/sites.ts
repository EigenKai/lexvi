/**
 * The two public copies of the app (build-time env, inlined by Next):
 * - the prepared site has no backend and shows prepared example responses. It links to the live
 *   copy through NEXT_PUBLIC_LEXVI_LIVE_URL;
 * - the live site (NEXT_PUBLIC_LEXVI_API_URL set) answers through the backend and links back
 *   through NEXT_PUBLIC_LEXVI_PREPARED_URL.
 * Kept apart from client.ts so the landing page doesn't pull in the API client and its mocks.
 */
const site = (v: string | undefined) => v?.trim().replace(/\/+$/, "") || null;

/** True on the live build: questions go to the backend instead of the prepared examples. */
export const isLiveBuild = Boolean(process.env.NEXT_PUBLIC_LEXVI_API_URL?.trim());
export const LIVE_SITE = site(process.env.NEXT_PUBLIC_LEXVI_LIVE_URL);
export const PREPARED_SITE = site(process.env.NEXT_PUBLIC_LEXVI_PREPARED_URL);
