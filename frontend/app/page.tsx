export default function Home() {
  return (
    <main className="welcome-page bg-gray-100">
      <div className="welcome-card">
        <p className="welcome-overline">Ticketing Vedem</p>
        <h1>Bienvenue dans votre espace sécurisé</h1>
        <p>
          Le même univers chromatique que la page de connexion vous accompagne depuis le premier regard.
        </p>
        <a href="/login" className="welcome-cta">
          Accéder à mon compte
        </a>
      </div>
    </main>
  );
}
