import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import { emailProblem, passwordProblem } from "./validators";

// Email and password only for now. Google sign-in needs its own OAuth client
// in Google Cloud Console, so it gets added once those credentials exist.
//
// `profile` and `validatePasswordRequirements` run on the server for every
// flow, so a client that skips the inline checks still cannot create a weak
// account or one with a malformed email. The email is only trimmed, not
// case-folded: the stored account key must keep matching every account that
// already exists. Case-insensitive email would need a one-off migration of
// authAccounts first.
const CalorieAIPassword = Password({
  profile(params) {
    const email = typeof params.email === "string" ? params.email : "";
    const problem = emailProblem(email);
    if (problem) throw new ConvexError(problem);
    return { email: email.trim() };
  },
  validatePasswordRequirements(password) {
    const problem = passwordProblem(password);
    if (problem) throw new ConvexError(problem);
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [CalorieAIPassword],
});
