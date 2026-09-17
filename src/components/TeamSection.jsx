import { PROJECT_GUIDE, TEAM_MEMBERS } from '../data/team';

export default function TeamSection() {
  return (
    <section className="content-section team-section" id="developed-by" aria-labelledby="team-heading">
      <div className="section-heading section-heading-wide">
        <div>
          <span className="eyebrow">Project team</span>
          <h2 id="team-heading">Developed by</h2>
          <p>Team details live in <code>src/data/team.js</code>, so the placeholders can be replaced in one clear location before submission.</p>
        </div>
      </div>

      <div className="team-grid">
        {TEAM_MEMBERS.map((member) => (
          <article className="team-card" key={member.slot}>
            {member.photo ? <img src={member.photo} alt={`${member.name} portrait`} className="student-photo" /> : <div className="student-photo photo-placeholder" aria-label="Student photograph placeholder">[STUDENT PHOTO]</div>}
            <span className="member-slot">{member.slot}</span>
            <h3>{member.name}</h3>
            <p>{member.registerNumber}</p>
          </article>
        ))}
      </div>

      <aside className="guide-card" aria-label="Project guide">
        <span className="eyebrow">Guided by</span>
        <strong>{PROJECT_GUIDE.name}</strong>
        <span>{PROJECT_GUIDE.role}</span>
      </aside>
    </section>
  );
}
