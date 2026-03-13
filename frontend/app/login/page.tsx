export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffe4c8,_#fef1df)] px-4 py-12 text-[#2b1d10]">
      <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[36px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.12)] md:flex-row">
        <div className="flex w-full flex-col gap-6 bg-[#d9731d] p-8 text-white md:w-1/2 md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#fff3dd]">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
              TICKETING VEDEM V1.02
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">Ticketing Vedem v1.02</h1>
            <p className="mt-4 text-base leading-relaxed text-[#ffefdd]">
              Une plateforme centralisée de suivi, priorisation et résolution des incidents pour les équipes de support.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-6 p-8 md:w-1/2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#936347]">Connexion</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#2b1d10]">Connexion — Ticketing Vedem v1.02</h2>
            <p className="mt-2 text-sm text-[#6a5b4f]">Accédez à votre espace de gestion des incidents.</p>
          </div>

          <form className="flex flex-col gap-4 rounded-[20px] bg-[#fbfaf7] p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9b7a55]">Identifiant</label>
            <input
              type="text"
              placeholder="ex: ADMIN"
              className="rounded-[14px] border border-[#f0d8bb] bg-white px-4 py-3 text-sm shadow-inner shadow-[#f8e4cc] placeholder:text-[#c19c73] focus:border-[#ad6526] focus:outline-none"
            />

            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9b7a55]">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              className="rounded-[14px] border border-[#f0d8bb] bg-white px-4 py-3 text-sm shadow-inner shadow-[#f8e4cc] placeholder:text-[#c19c73] focus:border-[#ad6526] focus:outline-none"
            />

            <button
              type="button"
              className="mt-2 rounded-[14px] bg-gradient-to-r from-[#d9731d] to-[#bb5b0f] py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-[0_15px_25px_rgba(217,115,29,0.4)]"
            >
              Se connecter →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
