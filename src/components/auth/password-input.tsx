"use client";

import { useState } from "react";

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        autoComplete={autoComplete}
        className={`w-full rounded-xl border border-stone-300 px-4 py-3 pr-11 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 ${className}`}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700"
        onClick={() => setVisible((current) => !current)}
        tabIndex={-1}
        type="button"
      >
        {visible ? (
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path
              d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5M9.5 5.2A10.9 10.9 0 0 1 12 5c5 0 9 4 10.5 7-.6 1.2-1.5 2.5-2.7 3.6M6.2 6.6C4 8.1 2.4 10.1 1.5 12c1.5 3 5.5 7 10.5 7 1.5 0 2.9-.3 4.2-.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path
              d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.75" />
          </svg>
        )}
      </button>
    </div>
  );
}
