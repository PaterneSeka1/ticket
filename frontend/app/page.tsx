export default function Home() {
  return (
    <div className="vdm-landing flex min-h-screen flex-col items-center justify-center px-4 text-[var(--vdm-dark)]">
      <div className="vdm-card space-y-6 rounded-[32px] p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--vdm-primary)]">Ticketing Vedem</p>
        <h1 className="text-4xl font-semibold">Bienvenue</h1>
        <p className="text-base text-[var(--vdm-muted)]">
          Accédez à votre espace sécurisé et gardez un œil sur tous vos tickets depuis un seul endroit.
        </p>
        <a
          href="/login"
          className="vdm-cta inline-flex items-center justify-center rounded-[16px] px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] transition hover:-translate-y-0.5"
        >
          Accéder à mon compte
        </a>
        <p className="text-xs text-[var(--vdm-muted-strong)]">
          La palette reprend les tonalités du portail d’authentification pour rester cohérente.
        </p>
      </div>
    </div>
  );
}
