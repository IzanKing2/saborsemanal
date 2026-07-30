"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: FieldErrors = {};
    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = "Introduce un email válido.";
    }

    if (password.length < 8) {
      errors.password = "La contraseña debe tener al menos 8 caracteres.";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "La contraseña debe incluir al menos una mayúscula.";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "La contraseña debe incluir al menos un número.";
    }

    if (confirmPassword !== password) {
      errors.confirmPassword = "Las contraseñas no coinciden.";
    }

    setFieldErrors(errors);
    setError(null);
    setSuccess(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess("Revisa tu email para confirmar tu cuenta.");
    }

    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Crear una cuenta
        </h1>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm"
            role="status"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="email"
            >
              Email
            </label>
            <input
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                fieldErrors.email ? "border-red-500" : "border-gray-300"
              }`}
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1" id="email-error">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="password"
            >
              Contraseña
            </label>
            <input
              aria-describedby={
                fieldErrors.password ? "password-error" : undefined
              }
              aria-invalid={Boolean(fieldErrors.password)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                fieldErrors.password ? "border-red-500" : "border-gray-300"
              }`}
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-1" id="password-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="confirm-password"
            >
              Confirmar contraseña
            </label>
            <input
              aria-describedby={
                fieldErrors.confirmPassword
                  ? "confirm-password-error"
                  : undefined
              }
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                fieldErrors.confirmPassword
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              id="confirm-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
            {fieldErrors.confirmPassword && (
              <p
                className="text-red-500 text-xs mt-1"
                id="confirm-password-error"
              >
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          ¿Ya tienes cuenta?{" "}
          <Link className="text-green-600 hover:underline" href="/login">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
