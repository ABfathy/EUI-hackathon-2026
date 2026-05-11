import { RxLogo } from "@/components/icons";

export default function RootLoading() {
  return (
    <>
      <style>{`
        @keyframes rx-progress {
          0%   { width: 0% }
          15%  { width: 30% }
          40%  { width: 55% }
          70%  { width: 74% }
          100% { width: 86% }
        }
        @keyframes rx-shimmer {
          0%   { background-position: -400% center }
          100% { background-position: 400% center }
        }
        @keyframes rx-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.5 }
          60%  { transform: scale(1.8); opacity: 0   }
          100% { transform: scale(1.8); opacity: 0   }
        }
        @keyframes rx-fade-up {
          from { opacity: 0; transform: translateY(5px) }
          to   { opacity: 1; transform: translateY(0)   }
        }
        @keyframes rx-blink {
          0%, 100% { opacity: 1 }
          50%      { opacity: 0 }
        }
        .rx-shimmer {
          background: linear-gradient(
            90deg,
            var(--surface-2) 20%,
            var(--surface-3) 50%,
            var(--surface-2) 80%
          );
          background-size: 400% 100%;
          animation: rx-shimmer 2.2s ease-in-out infinite;
        }
        .rx-fade-up-1 { animation: rx-fade-up 0.4s ease-out 0.1s both }
        .rx-fade-up-2 { animation: rx-fade-up 0.4s ease-out 0.2s both }
        .rx-fade-up-3 { animation: rx-fade-up 0.4s ease-out 0.3s both }
        .rx-fade-up-4 { animation: rx-fade-up 0.4s ease-out 0.4s both }
      `}</style>

      {/* Top progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "var(--surface-2)",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            height: "100%",
            background: "var(--accent)",
            animation: "rx-progress 6s cubic-bezier(0.1, 0.4, 0.2, 1) forwards",
          }}
        />
      </div>

      <main
        className="flex min-h-screen flex-col items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="flex flex-col items-center" style={{ gap: 32 }}>

          {/* Logo + pulse ring */}
          <div className="rx-fade-up-1" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                position: "absolute",
                inset: -14,
                borderRadius: "50%",
                border: "1px solid var(--accent)",
                animation: "rx-pulse-ring 2.4s ease-out infinite",
              }}
            />
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface-1)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <RxLogo size={20} className="text-[var(--accent)]" />
            </div>
          </div>

          {/* Wordmark + status */}
          <div className="rx-fade-up-2 flex flex-col items-center" style={{ gap: 8 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--fg-primary)",
              }}
            >
              RequireX
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-disabled)",
              }}
            >
              Initializing workspace
              <span style={{ animation: "rx-blink 1.1s step-start infinite" }}>_</span>
            </span>
          </div>

          {/* Skeleton content lines */}
          <div className="rx-fade-up-3 flex flex-col" style={{ gap: 8, width: 220 }}>
            <div className="rx-shimmer" style={{ height: 8,  borderRadius: 4, width: "90%" }} />
            <div className="rx-shimmer" style={{ height: 8,  borderRadius: 4, width: "70%", animationDelay: "0.15s" }} />
            <div className="rx-shimmer" style={{ height: 8,  borderRadius: 4, width: "82%", animationDelay: "0.3s"  }} />
            <div style={{ height: 4 }} />
            <div className="rx-shimmer" style={{ height: 8,  borderRadius: 4, width: "60%", animationDelay: "0.45s" }} />
            <div className="rx-shimmer" style={{ height: 8,  borderRadius: 4, width: "78%", animationDelay: "0.6s"  }} />
          </div>

        </div>
      </main>
    </>
  );
}
