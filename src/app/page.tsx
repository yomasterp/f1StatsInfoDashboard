const plannedAreas = [
  ["Historical core", "1950–2026 results, schedules, classifications, and standings."],
  ["Session analytics", "Lap, position, pit-stop, and tire-stint detail from verified 2018+ sessions."],
  ["Championship scenarios", "Points-aware driver and constructor title calculations."],
] as const;

export default function Home() {
  return (
    <main>
      <nav aria-label="Primary navigation">
        <a className="wordmark" href="#top">F1 <span>DATA</span></a>
        <div className="nav-links" aria-label="Planned sections">
          <span>Season</span><span>Explore</span><span>Compare</span><span>Scenarios</span>
        </div>
      </nav>

      <section className="hero" id="top">
        <p className="eyebrow">Local-first motorsport intelligence</p>
        <h1>Every era.<br /><em>One clear view.</em></h1>
        <p className="lede">A data-first Formula 1 dashboard for exploring race history, current-season standings, and the stories hidden in every lap.</p>
        <div className="availability" role="status">
          <span className="status-dot" aria-hidden="true" /> Foundation in progress — data ingestion is not connected yet.
        </div>
      </section>

      <section className="dashboard-preview" aria-labelledby="roadmap-heading">
        <div className="section-heading">
          <p className="eyebrow">Build roadmap</p>
          <h2 id="roadmap-heading">Designed for depth, not just race day.</h2>
        </div>
        <div className="area-grid">
          {plannedAreas.map(([title, description], index) => (
            <article className="area-card" key={title}>
              <span className="card-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>Unofficial portfolio project. Not affiliated with Formula 1, FIA, or any team.</span>
        <span>Coverage will explicitly identify unavailable data.</span>
      </footer>
    </main>
  );
}
