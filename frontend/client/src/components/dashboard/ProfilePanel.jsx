import { Eye, PencilLine, UploadCloud, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";

function ProfilePanel({
  user,
  friendsCount,
  onlineUsersCount,
  saveMessage,
  saveError,
  uploadMessage,
  uploadError,
  isUploading,
  onProfilePictureChange,
  onSaveProfile
}) {
  const joinedYear = new Date(user.createdAt || Date.now()).getFullYear();
  const [isEditing, setIsEditing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftName, setDraftName] = useState(user.name || "");
  const [draftBio, setDraftBio] = useState(user.bio || "");
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    setDraftName(user.name || "");
    setDraftBio(user.bio || "");
  }, [user.bio, user.name]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name || "");
    onProfilePictureChange(event);
  };

  const handleSave = async () => {
    const didSave = await onSaveProfile?.({
      name: draftName,
      bio: draftBio
    });

    if (didSave) {
      setIsEditing(false);
    }
  };

  return (
    <section className="workspace-panel profile-panel-page">
      <div className="panel-toolbar">
        <h2>Account Settings</h2>
      </div>

      <div className="profile-hero-card">
        <Avatar user={user} className="xxl" />
        <h1>{user.name || "User"}</h1>
        <p>{user.email || "No email available"}</p>
        <span className="member-pill">Member since {joinedYear}</span>
        <div className="hero-actions">
          <button type="button" className="primary-action" onClick={() => setIsEditing(true)}>
            <PencilLine size={16} />
            Edit Profile
          </button>
          <button type="button" className="ghost-action" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} />
            View Public Profile
          </button>
        </div>
      </div>

      <div className="profile-details-card">
        <div className="profile-details-head">
          <h3>Personal Information</h3>
          <p>Details about your account and contact info</p>
        </div>

        <div className="profile-row"><span>Full Name</span><strong>{user.name || "Not set"}</strong></div>
        <div className="profile-row"><span>Email Address</span><strong>{user.email || "Not set"}</strong></div>
        <div className="profile-row"><span>Connected Friends</span><strong>{friendsCount}</strong></div>
        <div className="profile-row"><span>Online Contacts</span><strong>{onlineUsersCount}</strong></div>
        <div className="profile-row"><span>Bio</span><strong>{user.bio || "No bio added yet."}</strong></div>

        {isEditing && (
          <div className="profile-edit-card">
            <div className="profile-edit-grid">
              <label className="profile-edit-field">
                <span>Full name</span>
                <input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Your name" />
              </label>
              <label className="profile-edit-field profile-edit-field-wide">
                <span>Bio</span>
                <textarea
                  value={draftBio}
                  onChange={(event) => setDraftBio(event.target.value.slice(0, 280))}
                  placeholder="Write a short public bio"
                  rows={4}
                />
              </label>
            </div>
            <div className="profile-edit-actions">
              <button type="button" className="ghost-link" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="button" className="primary-action" onClick={handleSave}>Save Profile</button>
            </div>
          </div>
        )}

        <label className="profile-upload-card" aria-label="Upload profile photo">
          <div className="profile-upload-card-icon">
            <UploadCloud size={18} />
          </div>
          <div className="profile-upload-card-copy">
            <strong>{isUploading ? "Uploading profile photo..." : "Choose a new profile image"}</strong>
            <p>{selectedFileName || "PNG, JPG, or WEBP up to 5MB"}</p>
          </div>
          <span className="profile-upload-card-action">{isUploading ? "Uploading" : "Browse"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>

        {saveMessage && <p className="status-text">{saveMessage}</p>}
        {saveError && <p className="error-text">{saveError}</p>}
        {uploadMessage && <p className="status-text">{uploadMessage}</p>}
        {uploadError && <p className="error-text">{uploadError}</p>}
      </div>

      <div className="profile-footer-row">
        <span>Last updated: {new Date().toLocaleDateString()}</span>
        <button type="button" className="danger-link">Deactivate Account</button>
      </div>

      {previewOpen && (
        <div className="modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="profile-preview-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-ghost" onClick={() => setPreviewOpen(false)} aria-label="Close public profile">
              <X size={18} />
            </button>

            <Avatar user={user} className="xxl" />
            <h3>{user.name || "User"}</h3>
            <p className="small-muted">Public profile preview</p>

            <div className="contact-profile-stats">
              <div className="contact-profile-row">
                <UserRound size={16} />
                <span>{user.bio || "No public bio added yet."}</span>
              </div>
              <div className="contact-profile-row">
                <Eye size={16} />
                <span>{friendsCount} connections can see this profile</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProfilePanel;
