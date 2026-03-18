"use client";

import { FormEvent, MouseEvent, Suspense, useState } from "react";
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

  const handlePasswordToggle = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    setShowPassword((value) => !value);
  };



  return (
    <>
      <Toaster />
      <div
        className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10 text-[#2b1d10]"
      >
        <div className="lg:w-[60%] w-full max-w-[800px] rounded-[24px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="hidden lg:flex lg:w-[340px] bg-[#d5d2ce] text-[#2b1d10] p-10 flex-col gap-6 border-r border-[#cfc7bf]">
              <div className="flex items-center gap-4 text-center justify-center">
                  <Image src="/logo1.png" alt="Logo vedem" width={150} height={150} className="object-contain" />
              </div>
              <div className="uppercase text-lg font-bold">TICKETING VEDEM V1.01</div>
              <p className="text-sm leading-relaxed text-[#3b3025]">
                Plateforme centralisée de ticketing — suivi, priorisation et résolution des incidents avec
                transparence.
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.4em] text-[#6b5b4f]">Connexion sécurisée</p>
            </div>

            <div className="flex-1 bg-white px-6 py-8 lg:px-12 lg:py-12 lg:w-[640px]">
              <div className="lg:hidden mb-6 flex items-center gap-4">
                <div>
                  {/* <p className="text-xs uppercase tracking-[0.3em] text-[#b86112]">Ticketing Vedem v1.02</p>
                  <h2 className="text-2xl font-semibold text-[#2b1d10]">Bienvenue</h2> */}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold uppercase text-black text-xl">
                  Connexion — TICKETING VEDEM V1.01
                </p>
                <p className="text-sm text-gray-500">Accédez à votre espace de gestion des incidents.</p>
              </div>

              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 mb-2">
                    Identifiant
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="ex : ADMIN"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      autoComplete="username"
                      className="w-full h-12 rounded-[16px] border border-gray-100 bg-gray-100/30 px-3 pl-11 text-sm text-[#2b1d10] shadow-[inset_0_10px_25px_rgba(0,0,0,0.05)] transition focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-gray-500 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="w-full h-12 rounded-[16px] border border-gray-100 bg-gray-100/30 px-3 pl-11 pr-12 text-sm text-[#2b1d10] shadow-[inset_0_10px_25px_rgba(0,0,0,0.05)] transition focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100/30"
                    />
                    <button
                      type="button"
                      onClick={handlePasswordToggle}
                      onMouseDown={handlePasswordToggle}
                      disabled={isLoading}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112]">
                  <span className="text-[0.75rem] text-[#6b5446]">Accès sécurisé</span>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-[16px] bg-[#f4b90a] text-[#2b1d10] text-sm font-semibold uppercase tracking-[0.4em] shadow-[0_12px_25px_rgba(244,185,10,0.35)] transition duration-200 ease-out disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(244,185,10,0.45)]"
                >
                  {isLoading ? "Connexion..." : "Se connecter →"}
                </button>
                <div className="flex flex-col gap-3">
                  <a
                    href="/forgot-password"
                    className="text-[0.75rem] font-semibold uppercase tracking-[0.3em] text-[#b86112] text-center"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
