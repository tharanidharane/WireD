import {
  ArchiveRestore,
  File,
  Image as ImageIcon,
  Link as LinkIcon,
  Mic,
  Video
} from "lucide-react";
import Avatar from "./Avatar";
import FileSection from "./FileSection";
import { getAssetUrl } from "../utils/media";

function GroupInfoPanel({
  activeFriend,
  currentUser,
  messages,
  open,
  onClose,
  isArchived,
  onToggleArchive
}) {
  const mediaMessages = messages.filter((message) => message.mediaUrl);
  const photoMessages = mediaMessages.filter((message) => message.mediaType === "image");
  const voiceMessages = mediaMessages.filter(
    (message) => message.mediaType === "video" && message.messageText === "__voice__"
  );
  const videoMessages = mediaMessages.filter(
    (message) => message.mediaType === "video" && message.messageText !== "__voice__"
  );
  const linkMessages = messages.filter((message) =>
    Boolean((message.messageText || "").match(/https?:\/\/[^\s]+/i))
  );
  if (!activeFriend) {
    return (
      <aside className={`group-info-panel ${open ? "open" : ""}`}>
        <div className="panel-card group-info-shell">
          <div className="panel-header-row">
            <h3>Group Info</h3>
            <button type="button" className="close-ghost" onClick={onClose}>
              x
            </button>
          </div>
          <div className="empty-panel large">
            <strong>No active chat</strong>
            <p>Select a conversation to see shared media and members.</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`group-info-panel ${open ? "open" : ""}`}>
      <div className="panel-card group-info-shell">
        <div className="panel-header-row">
          <h3>Group Info</h3>
          <button type="button" className="close-ghost" onClick={onClose}>
            x
          </button>
        </div>

        <div className="group-info-top">
          <Avatar user={activeFriend.user} className="xl" />
          <div>
            <strong>{activeFriend.user.name}</strong>
            <p>Direct chat details and shared content</p>
          </div>
        </div>

        <button type="button" className="info-action-button" onClick={onToggleArchive}>
          <ArchiveRestore size={16} />
          {isArchived ? "Move to chats" : "Move to archive"}
        </button>

        <div className="group-info-sections">
          <div className="group-subtitle">Files</div>

          <FileSection icon={ImageIcon} label="photos" count={photoMessages.length} open>
            <div className="media-thumb-grid">
              {photoMessages.slice(0, 4).map((message) => (
                <img
                  key={message._id}
                  src={getAssetUrl(message.mediaUrl)}
                  alt="Shared media"
                  className="media-thumb"
                />
              ))}
              {photoMessages.length === 0 && <p className="small-muted">No shared photos yet.</p>}
            </div>
          </FileSection>

          <FileSection icon={Video} label="videos" count={videoMessages.length}>
            <p className="small-muted">
              {videoMessages.length
                ? "Shared videos are available in the conversation."
                : "No shared videos yet."}
            </p>
          </FileSection>

          <FileSection icon={File} label="files" count={mediaMessages.length}>
            <p className="small-muted">Media files shared in this chat are grouped here.</p>
          </FileSection>

          <FileSection icon={Mic} label="audio files" count={voiceMessages.length}>
            <p className="small-muted">
              {voiceMessages.length
                ? "Voice notes shared in this chat appear here."
                : "No voice notes shared yet."}
            </p>
          </FileSection>

          <FileSection icon={LinkIcon} label="shared links" count={linkMessages.length}>
            <p className="small-muted">
              {linkMessages.length ? "Links were detected in the conversation." : "No shared links yet."}
            </p>
          </FileSection>
        </div>
      </div>
    </aside>
  );
}

export default GroupInfoPanel;
