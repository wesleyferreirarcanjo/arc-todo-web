import type { MemberShortlist, ProjectNameSession } from '../../types/name-session';

function reactionLabel(reaction: MemberShortlist['likedLoved'][number]['reaction']) {
  return reaction === 'loved' ? 'Love' : 'Like';
}

export function TeamViewsMode(props: { session: ProjectNameSession }) {
  const members = props.session.memberShortlists ?? [];
  if (members.length === 0) {
    return (
      <p className="names-empty">
        No one else has liked, loved, or scored a name yet.
      </p>
    );
  }

  return (
    <div className="names-shortlist-desk">
      {members.map((member) => (
        <section key={member.userId} aria-labelledby={`team-view-${member.userId}`}>
          <div className="names-shortlist-heading">
            <h3 id={`team-view-${member.userId}`}>{member.displayName}</h3>
          </div>
          <h4>Liked and loved</h4>
          {member.likedLoved.length === 0 ? (
            <p className="names-meta">No liked or loved names.</p>
          ) : (
            <ul className="names-checks-list">
              {member.likedLoved.map((item) => (
                <li key={item.candidateId} className="names-check-line">
                  {item.name} · {reactionLabel(item.reaction)}
                </li>
              ))}
            </ul>
          )}
          <h4>Scores</h4>
          {member.ratings.length === 0 ? (
            <p className="names-meta">No 1–10 scores yet.</p>
          ) : (
            <ul className="names-checks-list">
              {member.ratings.map((item) => (
                <li key={item.candidateId} className="names-check-line">
                  {item.name} · {item.overall}/10
                  {item.notes ? ` — ${item.notes}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
