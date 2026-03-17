import { Phone, Video } from "lucide-react";

const formatCallTime = (time) => {
  if (!time) return "";
  const target = new Date(time);
  return target.toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getStatusLabel = (status) => {
  if (status === "rejected" || status === "missed") return "Missed";
  if (status === "accepted" || status === "started") return "Incoming";
  if (status === "ended") return "Outgoing";
  return "Incoming";
};

function HomePanel({ callHistory = [] }) {
  const rows = callHistory;

  return (
    <section className="workspace-panel calls-panel">
      <div className="section-headline">
        <h1>Call History</h1>
        <p>Manage and review your recent communications and missed connections.</p>
      </div>

      <div className="tabs-strip">
        <button type="button" className="tab-link active">All Calls</button>
        <button type="button" className="tab-link">Missed</button>
        <button type="button" className="tab-link">Incoming</button>
        <button type="button" className="tab-link">Outgoing</button>
      </div>

      <div className="calls-table-wrap">
        <table className="calls-table">
          <thead>
            <tr>
              <th>CONTACT</th>
              <th>TYPE</th>
              <th>STATUS</th>
              <th>DATE & TIME</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No call records yet.</td>
              </tr>
            ) : rows.map((entry) => {
              const statusLabel = getStatusLabel(entry.status);
              return (
                <tr key={entry.id}>
                  <td className="contact-name">{entry.peerName}</td>
                  <td className="call-type-cell">
                    {entry.callType === "video" ? <Video size={14} /> : <Phone size={14} />}
                    {entry.callType === "video" ? "Video Call" : "Audio Call"}
                  </td>
                  <td>
                    <span className={`status-pill ${statusLabel.toLowerCase()}`}>{statusLabel}</span>
                  </td>
                  <td>{formatCallTime(entry.timestamp)}</td>
                  <td className="action-link">{statusLabel === "Missed" ? "Redial" : "Details"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination-row">
        <button type="button">&lt;</button>
        <button type="button" className="active">1</button>
        <button type="button">2</button>
        <button type="button">3</button>
        <button type="button">&gt;</button>
      </div>
    </section>
  );
}

export default HomePanel;
