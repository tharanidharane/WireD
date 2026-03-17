const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const origin = apiUrl.replace(/\/api\/?$/, "");

export const getAssetUrl = (assetPath) => {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const normalizedPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${origin}${normalizedPath}`;
};
