import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignUpSSOCallback() {
  return (
    <>
      {/* Required for Clerk bot protection when creating a sign-up via OAuth */}
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback />
    </>
  );
}
