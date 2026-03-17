import { useMemo, useState } from "react";

const groupTabs = [
  { key: "all", label: "All Groups" },
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
  { key: "requested", label: "Requested" }
];

function GroupsPanel({ groups = [], currentUserId, archivedChatIds = [] }) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const archivedGroupIds = useMemo(() => new Set(archivedChatIds), [archivedChatIds]);

  const groupedData = useMemo(() => {
    const archived = groups.filter((group) => archivedGroupIds.has(group._id));
    const active = groups.filter((group) => !archivedGroupIds.has(group._id));
    const requested = groups.filter(
      (group) => group.creator?._id === currentUserId && !group.lastMessage
    );

    return {
      all: groups,
      active,
      archived,
      requested
    };
  }, [archivedChatIds, archivedGroupIds, currentUserId, groups]);

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedGroups = groupedData[activeTab] || groupedData.all;

    if (!normalizedQuery) {
      return selectedGroups;
    }

    return selectedGroups.filter((group) => {
      const memberNames = (group.members || []).map((member) => member.name).join(" ").toLowerCase();
      return group.name.toLowerCase().includes(normalizedQuery) || memberNames.includes(normalizedQuery);
    });
  }, [activeTab, groupedData, query]);

  const emptyState = {
    all: "No groups yet",
    active: "No active groups",
    archived: "No archived groups",
    requested: "No requested groups"
  };

  return (
    <section className="workspace-panel groups-panel-page">
      <div className="panel-toolbar with-search">
        <div className="groups-toolbar-title">
          <h2>Groups</h2>
        </div>
        <label className="groups-search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search groups..." />
        </label>
      </div>

      <div className="section-headline split">
        <div>
          <h1>Organization Groups</h1>
          <p>Collaborate and manage team permissions across your organization.</p>
        </div>
        <button type="button" className="primary-action">Create Group</button>
      </div>

      <div className="tabs-strip">
        {groupTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-link ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="groups-grid">
        {visibleGroups.length === 0 ? (
          <article className="group-card">
            <div className="group-card-content">
              <h3>{emptyState[activeTab]}</h3>
              <p>{activeTab === "requested" ? "Requested groups will appear here when they are waiting for activity." : "Create a group to start collaborating."}</p>
            </div>
          </article>
        ) : visibleGroups.map((group, index) => (
          <article key={group._id} className={`group-card variant-${(index % 6) + 1}`}>
            <div className="group-card-hero" />
            <div className="group-card-content">
              <h3>{group.name}</h3>
              <p>{group.members?.length || 0} members</p>
              <div className="group-card-meta">
                <span>
                  {archivedGroupIds.has(group._id)
                    ? "Archived"
                    : group.lastMessage
                      ? "Active now"
                      : "Awaiting activity"}
                </span>
                <strong>{archivedGroupIds.has(group._id) ? "ARCHIVED" : activeTab === "requested" ? "REQUESTED" : "ACTIVE"}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="storage-card">
        <strong>STORAGE</strong>
        <div className="storage-track">
          <span />
        </div>
        <p>75% of 10GB used</p>
      </div>
    </section>
  );
}

export default GroupsPanel;
