import { Phone, Video } from "lucide-react";
import { useState } from "react";

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

const getCallCategory = (entry) => {
  if (entry.status === "rejected" || entry.status === "missed" || entry.status === "busy") {
    return "missed";
  }
  if (entry.direction === "incoming") {
    return "incoming";
  }
  if (entry.direction === "outgoing") {
    return "outgoing";
  }
  return "all";
};

const getCategoryLabel = (entry) => {
  const category = getCallCategory(entry);
  if (category === "missed") return "Missed";
  if (category === "incoming") return "Incoming";
  if (category === "outgoing") return "Outgoing";
  return "Call";
};

function HomePanel({ callHistory = [] }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filters = [
    { key: "all", label: "All Calls" },
    { key: "missed", label: "Missed" },
    { key: "incoming", label: "Incoming" },
    { key: "outgoing", label: "Outgoing" }
  ];

  const filteredRows = activeFilter === "all"
    ? callHistory
    : callHistory.filter((entry) => getCallCategory(entry) === activeFilter);

  return (
    <section className="workspace-panel calls-panel">
      <div className="section-headline">
        <h1>Call History</h1>
        <p>Manage and review your recent communications and missed connections.</p>
      </div>

      <div className="tabs-strip">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`tab-link ${activeFilter === filter.key ? "active" : ""}`}
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
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
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5}>No call records yet.</td>
              </tr>
            ) : filteredRows.map((entry) => {
              const categoryLabel = getCategoryLabel(entry);
              return (
                <tr key={entry.id}>
                  <td className="contact-name">{entry.peerName}</td>
                  <td className="call-type-cell">
                    {entry.callType === "video" ? <Video size={14} /> : <Phone size={14} />}
                    {entry.callType === "video" ? "Video Call" : "Audio Call"}
                  </td>
                  <td>
                    <span className={`status-pill ${getCallCategory(entry)}`}>{categoryLabel}</span>
                  </td>
                  <td>{formatCallTime(entry.timestamp)}</td>
                  <td className="action-link">{categoryLabel === "Missed" ? "Redial" : "Details"}</td>
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
