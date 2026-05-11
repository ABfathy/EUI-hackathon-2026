import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignInSSOCallback() {
  return (
    <>
      {/* Required for Clerk bot protection on OAuth callback */}
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback />
    </>
  );
}
