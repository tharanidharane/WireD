import { useMemo, useState } from "react";
import Avatar from "./Avatar";

function CreateGroupModal({ open, onClose, friends = [], onSubmit, isSubmitting = false }) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");

  const friendUsers = useMemo(
    () => friends.map((friend) => friend.user).filter(Boolean),
    [friends]
  );

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return friendUsers;

    return friendUsers.filter((user) =>
      `${user.name || ""} ${user.email || ""}`.toLowerCase().includes(normalized)
    );
  }, [friendUsers, query]);

  const handleToggleUser = (userId) => {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setName("");
    setQuery("");
    setSelectedIds([]);
    setError("");
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Group name is required.");
      return;
    }

    if (selectedIds.length === 0) {
      setError("Select at least one member.");
      return;
    }

    setError("");
    const success = await onSubmit?.({
      name: trimmedName,
      memberIds: selectedIds
    });

    if (success !== false) {
      handleClose();
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Create group">
      <form className="create-group-modal" onSubmit={handleSubmit}>
        <div className="create-group-header">
          <h3>Create Group</h3>
          <button type="button" className="text-action" onClick={handleClose} disabled={isSubmitting}>
            Close
          </button>
        </div>

        <label className="profile-field">
          <span>Group Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Engineering Team"
            maxLength={60}
            disabled={isSubmitting}
          />
        </label>

        <label className="profile-field">
          <span>Add Members</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            disabled={isSubmitting}
          />
        </label>

        {selectedIds.length > 0 && (
          <div className="create-group-selected">
            <strong>{selectedIds.length} selected</strong>
          </div>
        )}

        <div className="create-group-member-list">
          {visibleUsers.length === 0 ? (
            <p className="small-muted">No friends found.</p>
          ) : (
            visibleUsers.map((user) => {
              const isSelected = selectedIds.includes(user._id);
              return (
                <button
                  key={user._id}
                  type="button"
                  className={`create-group-member ${isSelected ? "active" : ""}`}
                  onClick={() => handleToggleUser(user._id)}
                  disabled={isSubmitting}
                >
                  <Avatar user={user} className="tiny" />
                  <div>
                    <strong>{user.name}</strong>
                    <p>{user.email}</p>
                  </div>
                  <span>{isSelected ? "Selected" : "Add"}</span>
                </button>
              );
            })
          )}
        </div>

        {error && <p className="status-message error">{error}</p>}

        <div className="create-group-actions">
          <button type="button" className="ghost-action" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="primary-action" disabled={isSubmitting || friendUsers.length === 0}>
            {isSubmitting ? "Creating..." : "Create Group"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateGroupModal;
