import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that require an authenticated Clerk user.
// /api/ingest stays open to HMAC-signed scraper calls — not gated here.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/pipeline(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  // Skip Next.js internals and all static files, unless found in search params
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes (so auth is available in them when needed)
    "/(api|trpc)(.*)",
  ],
};
