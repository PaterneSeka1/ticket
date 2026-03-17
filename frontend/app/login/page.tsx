"use client";

import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { login, type LoginPayload } from "@/api/auth";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";

function normIdentifier(value: string) {
  const normalized = value.trim();
  return normalized.includes("@") ? normalized.toLowerCase() : normalized;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const identifierTrim = normIdentifier(identifier);
    if (!identifierTrim || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);
    try {
      const payload: LoginPayload = { passwordHash: password };
      if (identifierTrim.includes("@")) {
        payload.email = identifierTrim;
      } else {
        payload.matricule = identifierTrim;
      }

      const response = await login(payload);
      sessionStorage.setItem("vdm_access_token", response.accessToken);
      localStorage.setItem("employee", JSON.stringify(response.user));

      toast.success("Connexion réussie");
      const nextRoute = getRedirectRouteForRole(response.user?.role);
      window.location.href = nextRoute;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !isLoading) {
      event.preventDefault();
      document.getElementById("login-submit")?.click();
    }
  };

  const handlePasswordToggle = () => {
    setShowPassword((value) => !value);
  };

  const leftFeatures = [
    "Suivi temps réel des incidents",
    "Priorisation intelligente des tickets",
    "Tableaux de bord analytiques",
  ];

  return (
    <>
      <Toaster />
      <div
        className="min-h-screen bg-[#fff7ef] flex items-center justify-center px-4 py-10 text-[#2b1d10]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.9), transparent 45%), linear-gradient(180deg, #fff8ef 0%, #f9f0e3 40%, #f2e5d3 100%)",
        }}
      >
        <div className="w-full max-w-5xl rounded-[32px] bg-white/70 shadow-[0_40px_110px_rgba(0,0,0,0.25)] border border-[#efd7c7] overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#de6f0c] via-[#d56a0a] to-[#b84303] text-white p-10 flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-[20px] bg-white/20 p-1 flex items-center justify-center shadow-[0_12px_25px_rgba(0,0,0,0.35)]">
                  <div className="h-16 w-16 rounded-[16px] bg-gradient-to-br from-white to-[#f5b272] flex items-center justify-center overflow-hidden">
                    <Image
                      src="/logo.jpeg"
                      alt="Logo Vedem"
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/70">Bienvenue</p>
                  <h1 className="text-3xl font-semibold tracking-tight">Ticketing Vedem</h1>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.5em] text-white/70">Version 1.02</p>
                <p className="text-sm leading-relaxed text-white/90">
                  Une plateforme centralisée de gestion des incidents pour prioriser, suivre et résoudre
                  les tickets avec clarté.
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {leftFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-white/90" />
                    <span className="text-white/90 leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Connexion sécurisée</p>
            </div>

            <div className="flex-1 bg-white px-6 py-8 lg:px-10 lg:py-12">
              <div className="lg:hidden mb-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-[18px] bg-[#f7c39a] p-1 flex items-center justify-center shadow-[0_12px_25px_rgba(0,0,0,0.15)]">
                  <Image src="/logo.jpeg" alt="Logo vedem" width={52} height={52} className="object-contain" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#b86112]">Ticketing Vedem v1.02</p>
                  <h2 className="text-2xl font-semibold text-[#2b1d10]">Bienvenue</h2>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.3em] text-[#b96116]">Connexion à votre espace</p>
                <p className="text-gray-600 text-sm">Entrez vos identifiants pour accéder à votre plateforme.</p>
              </div>

              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112] mb-2">
                    Identifiant
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c37b25]" />
                    <input
                      type="text"
                      placeholder="ex : ADMIN"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      autoComplete="username"
                      className="w-full h-12 rounded-[16px] border border-[#f0d5c7] bg-[#fff0e1] px-3 pl-11 text-sm text-[#2b1d10] shadow-[inset_0_10px_25px_rgba(0,0,0,0.05)] transition focus:border-[#d66b0b] focus:outline-none focus:ring-2 focus:ring-[#d66b0b]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112] mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c37b25]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="w-full h-12 rounded-[16px] border border-[#f0d5c7] bg-[#fff0e1] px-3 pl-11 pr-12 text-sm text-[#2b1d10] shadow-[inset_0_10px_25px_rgba(0,0,0,0.05)] transition focus:border-[#d66b0b] focus:outline-none focus:ring-2 focus:ring-[#d66b0b]/30"
                    />
                    <button
                      type="button"
                      onClick={handlePasswordToggle}
                      disabled={isLoading}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c37b25]"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112]">
                  <span className="text-[0.75rem] text-[#6b5446]">Accès sécurisé</span>
                  <a href="/forgot-password" className="text-[#d56b0a] hover:text-[#a94b0c] underline">
                    Mot de passe oublié ?
                  </a>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-[16px] bg-gradient-to-r from-[#d66b0b] via-[#c66113] to-[#b54805] text-white text-sm font-semibold uppercase tracking-[0.4em] shadow-[0_14px_30px_rgba(214,107,11,0.3)] transition duration-200 ease-out disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-[0_20px_35px_rgba(214,107,11,0.45)]"
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
