"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlignLeft, Minimize2, Copy, Trash2, Check } from "lucide-react";
import { tryParse, formatJson, minifyJson } from "@/lib/json-format";
import { JsonInput } from "@/components/json/json-input";
import { JsonOutput } from "@/components/json/json-output";
import { JsonErrorBanner } from "@/components/json/json-error-banner";
import { cn } from "@/lib/utils";

const buttonVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
};

export default function JsonPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const parseResult = useMemo(() => {
    if (!input.trim()) return null;
    return tryParse(input);
  }, [input]);

  const error =
    input.trim() && parseResult && !parseResult.ok ? parseResult.error : null;

  function handleFormat() {
    const result = formatJson(input);
    setOutput(result);
  }

  function handleMinify() {
    const result = minifyJson(input);
    setOutput(result);
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    setInput("");
    setOutput("");
  }

  const actions = [
    {
      label: "Format",
      icon: AlignLeft,
      onClick: handleFormat,
      disabled: !input.trim() || !!error,
      primary: true,
    },
    {
      label: "Minify",
      icon: Minimize2,
      onClick: handleMinify,
      disabled: !input.trim() || !!error,
      primary: false,
    },
    {
      label: copied ? "Copied!" : "Copy",
      icon: copied ? Check : Copy,
      onClick: handleCopy,
      disabled: !output,
      primary: false,
    },
    {
      label: "Clear",
      icon: Trash2,
      onClick: handleClear,
      disabled: !input && !output,
      primary: false,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 md:h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between gap-2"
      >
        <h1 className="text-lg font-semibold text-foreground shrink-0">JSON Formatter</h1>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {actions.map(({ label, icon: Icon, onClick, disabled, primary }, i) => (
            <motion.button
              key={label}
              variants={buttonVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.04, duration: 0.18 }}
              onClick={onClick}
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                primary
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                  : "border border-border text-foreground hover:bg-accent disabled:opacity-40",
                "disabled:cursor-not-allowed"
              )}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center gap-1.5"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </motion.span>
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Error banner */}
      <JsonErrorBanner error={error} />

      {/* Split panels — stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row flex-1 gap-4 md:min-h-0">
        <JsonInput value={input} onChange={setInput} />
        <JsonOutput value={output} />
      </div>
    </div>
  );
}
