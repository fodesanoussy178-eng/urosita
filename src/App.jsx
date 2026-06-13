const missions = [
  {
    title: 'Publier une micro-mission',
    detail: 'Définir un besoin clair, une durée courte et un cadre de validation lisible.',
  },
  {
    title: 'Suivre les réponses',
    detail: 'Observer les candidatures, les statuts et les prochaines actions en un coup d’œil.',
  },
  {
    title: 'Tracer les résultats',
    detail: 'Conserver l’historique des missions et des livrables pour sécuriser le mandat.',
  },
];

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Plateforme de micro-missions de la MEL</p>
        <h1>Urosi-t</h1>
        <p className="lead">
          Un prototype React pour orchestrer des missions courtes, lisibles et pilotables par les équipes mandataires.
        </p>

        <div className="hero-actions">
          <a href="#missions" className="primary-action">
            Explorer les missions
          </a>
          <a href="#cadre" className="secondary-action">
            Voir le cadre
          </a>
        </div>
      </section>

      <section className="panel grid-panel" id="missions" aria-label="Fonctionnalités principales">
        {missions.map((mission) => (
          <article key={mission.title} className="mission-card">
            <h2>{mission.title}</h2>
            <p>{mission.detail}</p>
          </article>
        ))}
      </section>

      <section className="panel frame-panel" id="cadre">
        <div>
          <p className="section-label">Cadre opérationnel</p>
          <h2>Des jalons simples, un suivi explicite, un prototype prêt à étendre.</h2>
        </div>
        <ul>
          <li>Vue d’ensemble des missions ouvertes et closes</li>
          <li>Traçabilité des échanges et des validations</li>
          <li>Base prête pour brancher l’authentification et les données métier</li>
        </ul>
      </section>
    </main>
  );
}