import { useState } from 'react';
import { PROJECT_GUIDE, TEAM_MEMBERS } from '../data/team';

export default function TeamSection() {
  const [guidePhotoFailed, setGuidePhotoFailed] = useState(false);

  return (
    <section
      className="content-section team-section"
      id="developed-by"
      aria-labelledby="team-heading"
    >
      <div className="section-heading section-heading-wide">
        <div>
          <span className="eyebrow">Project team</span>
          <h2 id="team-heading">Developed by</h2>
        </div>
      </div>

      <div className="team-grid">
        {TEAM_MEMBERS.map((member) => (
          <article className="team-card" key={member.slot}>
            {member.photo ? (
              <img
                src={member.photo}
                alt={`${member.name} portrait`}
                className="student-photo"
              />
            ) : (
              <div
                className="student-photo photo-placeholder"
                aria-label="Student photograph placeholder"
              >
                [STUDENT PHOTO]
              </div>
            )}

            <span className="member-slot">{member.slot}</span>
            <h3>{member.name}</h3>
            <h3>{member.registerNumber}</h3>
          </article>
        ))}
      </div>

      <aside className="guide-card" aria-label="Project guide">
        <div className="guide-photo-wrap">
          {!guidePhotoFailed ? (
            <img
              src={PROJECT_GUIDE.photo}
              alt={`${PROJECT_GUIDE.name} profile`}
              className="guide-photo"
              onError={() => setGuidePhotoFailed(true)}
            />
          ) : (
            <span
              className="guide-initials"
              role="img"
              aria-label={`Initials placeholder for ${PROJECT_GUIDE.name}`}
            >
              SA
            </span>
          )}
        </div>

        <span className="eyebrow">Guided by</span>
        <strong>{PROJECT_GUIDE.name}</strong>
        <span>{PROJECT_GUIDE.role}</span>
      </aside>
    </section>
  );
}
