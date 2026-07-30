"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: FieldErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      errors.email = "El email es obligatorio.";
    }

    if (!password) {
      errors.password = "La contraseña es obligatoria.";
    }

    setFieldErrors(errors);
    setError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Iniciar sesión
        </h1>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm"
            role="alert"
          >
            {error}
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

          <div className="mb-6">
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

          <button
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          <Link
            className="text-green-600 hover:underline"
            href="/auth/forgot-password"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        <p className="text-center text-sm text-gray-600 mt-4">
          ¿No tienes cuenta?{" "}
          <Link className="text-green-600 hover:underline" href="/register">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
