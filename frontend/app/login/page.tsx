"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Login() {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedIdentity = identity.trim();
    if (!trimmedIdentity) {
      toast.error("Merci de renseigner votre email ou matricule.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        passwordHash: password,
      };
      if (trimmedIdentity.includes("@")) {
        payload.email = trimmedIdentity;
      } else {
        payload.matricule = trimmedIdentity;
      }

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          responseBody?.message ?? "Impossible de se connecter pour le moment.",
        );
      }

      if (responseBody?.accessToken) {
        sessionStorage.setItem("vdm_access_token", responseBody.accessToken);
      }

      const name = responseBody?.user?.prenom ?? responseBody?.user?.email ?? "Utilisateur";
      toast.success(`Bienvenue ${name} ! Votre session est prête.`);
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vdm-landing flex min-h-screen flex-col items-center justify-center px-4 text-[var(--vdm-dark)]">
      <Toaster position="top-right" />
      <div className="vdm-card w-full max-w-md space-y-10 rounded-[32px] p-10 text-center">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--vdm-primary)]">
            Ticketing Vedem
          </p>
          <h1 className="text-4xl font-semibold">Connexion</h1>
          <p className="text-sm text-[var(--vdm-muted)]">
            Identifiez-vous pour retrouver vos tickets et suivre leur statut en
            toute sécurité.
          </p>
        </div>

        <form className="space-y-6 text-left" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--vdm-muted-strong)]">
              Email ou matricule
            </span>
            <input
              required
              type="text"
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              placeholder="vous@exemple.com ou MAT-1337"
              className="mt-2 w-full rounded-[16px] border border-[#d9cfc3] bg-white px-4 py-3 text-sm text-[var(--vdm-dark)] shadow-[0_15px_30px_rgba(0,0,0,0.05)] focus:border-[var(--vdm-primary)] focus:outline-none"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--vdm-muted-strong)]">
              Mot de passe
            </span>
            <div className="relative mt-2">
              <input
                required
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-[16px] border border-[#d9cfc3] bg-white px-4 py-3 text-sm text-[var(--vdm-dark)] shadow-[0_15px_30px_rgba(0,0,0,0.05)] focus:border-[var(--vdm-primary)] focus:outline-none"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="absolute inset-y-0 right-2 flex items-center justify-center rounded-full px-2 text-[var(--vdm-muted)] transition hover:text-[var(--vdm-dark)]"
                aria-label={
                  passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  {passwordVisible ? (
                    <>
                      <path d="M1 1l22 22" />
                      <path d="M4.5 4.37a11.49 11.49 0 0 1 15 7.54 11.52 11.52 0 0 1-2.4 3.98" />
                    </>
                  ) : (
                    <>
                      <path d="M1.39 12a19.79 19.79 0 0 1 3.01-4.27C7.34 5 10.2 4 12 4s4.66 1 7.6 3.73A19.79 19.79 0 0 1 22.61 12a19.79 19.79 0 0 1-3.01 4.27C16.66 19 13.8 20 12 20s-4.66-1-7.6-3.73A19.79 19.79 0 0 1 1.39 12z" />
                      <circle cx="12" cy="12" r="3.5" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className={`vdm-cta inline-flex w-full items-center justify-center rounded-[16px] px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] ${
              loading ? "opacity-70" : ""
            }`}
          >
            {loading ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>

        <div className="space-y-2 text-sm text-[var(--vdm-muted)]">
          <p>
            Pas encore de compte ?{" "}
            <Link
              href="/"
              className="font-semibold text-[var(--vdm-primary)] underline-offset-4 hover:underline"
            >
              Retour à l’accueil
            </Link>
          </p>
          <p className="text-xs text-[var(--vdm-muted-strong)]">
            Votre accès est protégé par les mêmes tonalités chaudes que notre
            landing page.
          </p>
        </div>

      </div>
    </div>
  );
}
