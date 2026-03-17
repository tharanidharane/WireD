import Avatar from "../Avatar";

function ProfilePanel({
  user,
  friendsCount,
  onlineUsersCount,
  uploadMessage,
  uploadError,
  isUploading,
  onProfilePictureChange
}) {
  return (
    <section className="dashboard-panel profile-page">
      <div className="profile-panel">
        <Avatar user={user} className="xxl" />
        <div className="profile-panel-copy">
          <p className="eyebrow">Profile</p>
          <h1>{user.name || "Wired User"}</h1>
          <p className="dashboard-copy">{user.email || "No email available"}</p>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <strong>{friendsCount}</strong>
          <span>Connected Friends</span>
        </article>
        <article className="stat-card">
          <strong>{onlineUsersCount}</strong>
          <span>Users Online</span>
        </article>
        <article className="stat-card">
          <strong>{new Date(user.createdAt || Date.now()).toLocaleDateString()}</strong>
          <span>Joined</span>
        </article>
      </div>

      <article className="content-card">
        <p className="eyebrow">Account</p>
        <h3>Profile details</h3>
        <p>Name: {user.name || "Not set"}</p>
        <p>Email: {user.email || "Not set"}</p>
        <p>Profile picture: {user.profilePicture ? "Added" : "Not added yet"}</p>
      </article>

      <article className="content-card accent">
        <p className="eyebrow">Profile Picture</p>
        <h3>Upload a new photo</h3>
        <p>Add a JPG, PNG, or WEBP image up to 5MB.</p>
        <label className="upload-field">
          <span>{isUploading ? "Uploading..." : "Choose image"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={onProfilePictureChange}
            disabled={isUploading}
          />
        </label>
        {uploadMessage && <p className="status-text">{uploadMessage}</p>}
        {uploadError && <p className="error-text">{uploadError}</p>}
      </article>
    </section>
  );
}

export default ProfilePanel;
