import { Trash2 } from "lucide-react";
import Avatar from "./Avatar";

function FriendList({
  friends,
  activeFriendId,
  onSelectFriend,
  requests,
  onAcceptRequest,
  onlineUsers,
  onDeleteFriend
}) {
  return (
    <div className="friend-list">
      <div className="panel-section">
        <div className="section-title">Friend Requests</div>
        {requests.length === 0 ? (
          <p className="empty-state small">No pending requests</p>
        ) : (
          requests.map((request) => (
            <div key={request._id} className="request-card">
              <div>
                <strong>{request.requester.name}</strong>
                <p className="request-hint">Wants to connect with you</p>
              </div>
              <button onClick={() => onAcceptRequest(request._id)}>Accept</button>
            </div>
          ))
        )}
      </div>

      <div className="panel-section">
        <div className="section-title">Friends ({friends.length})</div>
        {friends.length === 0 ? (
          <p className="empty-state small">Add friends to begin chatting</p>
        ) : (
          friends.map((friend) => {
            const isOnline = onlineUsers.includes(friend.user._id);

            return (
              <div
                key={friend.user._id}
                className={`friend-card ${activeFriendId === friend.user._id ? "active" : ""}`}
              >
                <button className="friend-select" onClick={() => onSelectFriend(friend)}>
                  <Avatar user={friend.user} />
                  <div className="friend-meta">
                    <div className="friend-topline">
                      <strong>{friend.user.name}</strong>
                      <span className={`presence ${isOnline ? "online" : ""}`}>
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <p>{friend.lastMessage?.messageText || "Share a message"}</p>
                  </div>
                </button>
                <button
                  type="button"
                  className="friend-delete"
                  onClick={() => onDeleteFriend(friend)}
                  aria-label={`Remove ${friend.user.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default FriendList;
