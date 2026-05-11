import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

import { RxLogo } from "@/components/icons";

const clerkAppearance = {
  variables: {
    colorBackground: "#1c1e21",
    colorText: "#efeee9",
    colorTextSecondary: "#9a9a9e",
    colorInputBackground: "#141517",
    colorInputText: "#efeee9",
    colorPrimary: "#7a9bb8",
    colorNeutral: "#efeee9",
    colorTextOnPrimaryBackground: "#06121e",
    colorAlphaShade: "#efeee9",
    borderRadius: "8px",
    fontFamily: "Geist, system-ui, sans-serif",
    fontSize: "14px",
  },
} as const;

export default function SignUpPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10"
      style={{ background: "var(--background)" }}
    >
      <Link
        href="/"
        className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"
      >
        <RxLogo size={18} className="text-[var(--accent)]" />
        <span
          className="text-[15px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--fg-primary)" }}
        >
          RequireX
        </span>
      </Link>
      <SignUp routing="path" path="/sign-up" appearance={clerkAppearance} />
    </main>
  );
}
