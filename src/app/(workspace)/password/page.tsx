"use client";

import { motion } from "motion/react";
import { usePasswordGenerator } from "@/hooks/use-password-generator";
import { PasswordDisplay } from "@/components/password/password-display";
import { PasswordOptionsPanel } from "@/components/password/password-options";
import { StrengthMeter } from "@/components/password/strength-meter";

export default function PasswordPage() {
  const { password, options, entropy, strength, regenerate, updateOption } =
    usePasswordGenerator();

  return (
    <div className="flex h-full items-start justify-center p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-md space-y-5"
      >
        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-lg font-semibold text-foreground"
        >
          Password Generator
        </motion.h1>

        <PasswordDisplay password={password} onRegenerate={regenerate} />

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.06 }}
        >
          <StrengthMeter strength={strength} entropy={entropy} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <PasswordOptionsPanel options={options} onUpdate={updateOption} />
        </motion.div>
      </motion.div>
    </div>
  );
}
