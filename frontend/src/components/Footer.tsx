"use client";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-border py-6">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-xs text-muted">
            <span className="font-medium text-foreground">Alpha Compass</span>
            {" "}— AI-powered trading intelligence for{" "}
            <a
              href="https://pacifica.fi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Pacifica DEX
            </a>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted">
            <span>Powered by</span>
            <div className="flex items-center gap-3">
              <span className="rounded bg-card px-2 py-0.5 text-foreground/70">
                Pacifica API
              </span>
              <span className="rounded bg-card px-2 py-0.5 text-foreground/70">
                Groq / Meta Llama
              </span>
              <span className="rounded bg-card px-2 py-0.5 text-foreground/70">
                OpenAI GPT-4o
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            <a
              href="https://github.com/LibruaryNFT/pacifica-alpha-compass"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
            <span>|</span>
            <span>Pacifica Hackathon 2026</span>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-3 text-center text-[10px] text-muted/60">
          Not financial advice. Alpha Compass is experimental software for educational and research purposes only.
          Trading perpetual futures involves substantial risk of loss. Past performance does not guarantee future results.
        </div>
      </div>
    </footer>
  );
}
