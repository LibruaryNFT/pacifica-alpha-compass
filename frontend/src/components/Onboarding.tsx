"use client";

import { useState, useEffect } from "react";
import { Zap, Brain, BarChart3, ArrowRight, X } from "lucide-react";

const STEPS = [
  {
    icon: Zap,
    iconColor: "text-yellow-400",
    title: "Alpha Score",
    description:
      "Our proprietary 0-100 metric combining 5 trading signals — momentum, volatility, funding rates, volume, and orderbook depth. Higher = more bullish.",
  },
  {
    icon: Brain,
    iconColor: "text-accent",
    title: "AI Consensus",
    description:
      "Three AI models (Llama-4 Scout, GPT-4o, Llama-3.3 70B) independently analyze each market. Their consensus gives you confidence in the signal.",
  },
  {
    icon: BarChart3,
    iconColor: "text-primary",
    title: "Actionable Intelligence",
    description:
      "Every analysis comes with specific trade suggestions — entry zone, target, stop loss, and risk:reward ratio. Not just data, but what to do with it.",
  },
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem("alpha_compass_onboarded");
      if (!seen) {
        setShow(true);
      }
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("alpha_compass_onboarded", "true");
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!show) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 text-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Step indicator */}
        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-card-hover"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-card">
            <Icon className={`h-8 w-8 ${current.iconColor}`} />
          </div>
          <h2 className="mt-4 text-xl font-bold">{current.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {current.description}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-muted hover:text-foreground"
          >
            Skip tour
          </button>
          <button
            onClick={next}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-primary/80"
          >
            {step < STEPS.length - 1 ? (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Get Started"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
