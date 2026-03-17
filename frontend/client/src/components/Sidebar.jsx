import { Search, UserPlus } from "lucide-react";
import { useState } from "react";
import FriendList from "./FriendList";

function Sidebar({
  user,
  friends,
  activeFriend,
  onSelectFriend,
  searchResults,
  onSearch,
  onSendFriendRequest,
  requests,
  onAcceptRequest,
  onlineUsers,
  friendActionMessage,
  onDeleteFriend
}) {
  const [query, setQuery] = useState("");

  const handleSearch = (value) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-identity">
          <p className="eyebrow">People</p>
          <h2>Recent Chat</h2>
          <span className="sidebar-subtext">Search a friend or pick an active conversation.</span>
        </div>
      </div>

      <label className="search-box">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search users by email"
        />
      </label>

      {friendActionMessage && <p className="status-text">{friendActionMessage}</p>}

      <div className="sidebar-pills">
        <span className="sidebar-pill active">Recent Chat</span>
        <span className="sidebar-pill">New Chat {requests.length}</span>
      </div>

      {query.trim() && (
        <div className="search-results">
          {searchResults.length === 0 ? (
            <p className="empty-state small">No matching users</p>
          ) : (
            searchResults.map((result) => (
              <div key={result._id} className="search-card">
                <div>
                  <strong>{result.name}</strong>
                </div>
                <button onClick={() => onSendFriendRequest(result._id)}>
                  <UserPlus size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <FriendList
        friends={friends}
        activeFriendId={activeFriend?.user._id}
        onSelectFriend={onSelectFriend}
        requests={requests}
        onAcceptRequest={onAcceptRequest}
        onlineUsers={onlineUsers}
        onDeleteFriend={onDeleteFriend}
      />
    </aside>
  );
}

export default Sidebar;
