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
        <div className="lg:w-[60%] md:w-[60%] w-full max-w-[800px] rounded-[24px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="hidden lg:flex lg:w-[340px] bg-[#d5d2ce] text-[#2b1d10] p-10 flex-col gap-6 border-r border-[#cfc7bf]">
              <div className="flex items-center gap-4">
                <Image src="/logo1.png" alt="Logo vedem" width={150} height={150} className="object-contain" />
              </div>
              <div className="uppercase text-lg font-bold">TICKETING VEDEM V1.01</div>
              <p className="text-sm leading-relaxed text-[#3b3025]">
                Plateforme centralisée de ticketing — suivi, priorisation et résolution des incidents avec
                transparence.
              </p>
            </div>

            <div className="flex-1 bg-white px-6 py-8 lg:px-12 lg:py-12 lg:w-[640px]">
              <div className="lg:hidden mb-6 flex items-center gap-4 text-center justify-center">
                <div>
                  <div className="flex items-center gap-4">
                    <Image src="/logo1.png" alt="Logo vedem" width={80} height={80} className="object-contain" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-bold uppercase text-[#2b1d10] text-2xl text-center">
                  Connexion
                </p>
                <p className="text-sm text-gray-500">Accédez à votre espace de gestion des incidents.</p>
              </div>
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-black ms-3">
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
                      className="w-full h-10 rounded-[16px] border border-gray-800/40 bg-gray-100/30 px-3 pl-11 text-sm text-[#2b1d10] shadow-[inset_0_10px_25px_rgba(0,0,0,0.05)] transition focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-black ms-3">
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
                      className="w-full h-10 rounded-[16px] border border-gray-800/40 bg-gray-100/30 px-3 pl-11 pr-12 text-sm text-[#2b1d10] shadow-[inset_0_10px_25px_rgba(0,0,0,0.05)] transition focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100/30"
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

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="mx-auto w-50 block h-10 rounded-[16px] bg-[#f4b90a] text-[#2b1d10] text-sm font-semibold uppercase tracking-[0.1em] shadow-[0_12px_25px_rgba(244,185,10,0.35)] transition duration-200 ease-out disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(244,185,10,0.45)]"
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                </button>
                <div className="flex flex-col gap-3">
                  <a
                    href="/forgot-password"
                    className="text-sm font-semibold uppercase text-center underline hover:text-[#f4b90a] transition"
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
