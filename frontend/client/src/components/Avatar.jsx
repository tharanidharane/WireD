import { getAssetUrl } from "../utils/media";

function Avatar({ user, className = "", fallback = "W" }) {
  const initial = user?.name?.slice(0, 1)?.toUpperCase() || fallback;
  const profilePictureUrl = getAssetUrl(user?.profilePicture);

  return (
    <div className={`avatar ${className}`.trim()}>
      {profilePictureUrl ? (
        <img src={profilePictureUrl} alt={`${user?.name || "User"} profile`} className="avatar-image" />
      ) : (
        initial
      )}
    </div>
  );
}

export default Avatar;
