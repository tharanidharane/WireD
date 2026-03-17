import { Activity, MessageSquare, Phone, Users, Video } from "lucide-react";

const formatCallTime = (time) => {
  if (!time) return "";
  const target = new Date(time);
  return target.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

function HomePanel({ user, friends, requests, onlineUsers, callHistory = [], onOpenMessages }) {
  const stats = [
    { label: "Friends", value: friends.length, icon: Users },
    { label: "Pending Requests", value: requests.length, icon: MessageSquare },
    { label: "Online Now", value: onlineUsers.length, icon: Activity }
  ];

  return (
    <section className="dashboard-panel">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Welcome back, {user.name || "User"}</h1>
          <p className="dashboard-copy">
            Keep your messages, calls, and connections in a single calm place inspired by the new design system.
          </p>
        </div>
        <button type="button" className="primary-action" onClick={onOpenMessages}>
          Open Messages
        </button>
      </div>

      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon }) => (
          <article key={label} className="stat-card">
            <div className="stat-icon">
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>

      <article className="content-card call-history-panel">
        <div className="panel-header-row compact">
          <h4>Call history</h4>
        </div>

        {callHistory.length === 0 ? (
          <p className="small-muted">No calls yet. Start an audio or video call to see history here.</p>
        ) : (
          <div className="call-history-list">
            {callHistory.map((entry) => (
              <div key={entry.id} className="call-history-row">
                <div className="call-history-icon">
                  {entry.callType === "video" ? <Video size={16} /> : <Phone size={16} />}
                </div>

                <div className="call-history-copy">
                  <strong>{entry.peerName}</strong>
                  <p>{entry.direction} {entry.callType} call • {entry.status}</p>
                </div>

                <span className="small-muted">{formatCallTime(entry.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

export default HomePanel;
