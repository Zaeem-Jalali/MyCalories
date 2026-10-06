// On Android the Google return link (calorieai://...?code=...) reaches
// expo-router as a deep link as well as the in-app browser session. Left alone
// it navigates to "/", the auth gate bounces a signed-out user to /welcome and
// signIn.tsx unmounts mid code-exchange. Keep the user on the sign-in screen.
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  if (/[?&]code=/.test(path)) return "/signIn";
  return path;
}
