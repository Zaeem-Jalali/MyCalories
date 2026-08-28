import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

// Email and password only for now. Google sign-in needs its own OAuth client
// in Google Cloud Console, so it gets added once those credentials exist.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
