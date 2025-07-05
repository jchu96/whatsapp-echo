import packageJson from "../../package.json";

/**
 * Application version utilities
 * Single source of truth for version information
 */

export const APP_VERSION = packageJson.version;

export const getVersion = () => APP_VERSION;

export const getShortVersion = () => {
  const [major, minor] = APP_VERSION.split(".");
  return `v${major}.${minor}`;
};

export const getFullVersionInfo = () => ({
  full: APP_VERSION,
  short: getShortVersion(),
  major: APP_VERSION.split(".")[0],
  minor: APP_VERSION.split(".")[1],
  patch: APP_VERSION.split(".")[2] || "0"
});

// Date handling - using a simple approach for now
export const getBuildDate = () => {
  return "July 2025"; // Can be made dynamic later if needed
};

export const getVersionWithDate = () => {
  return `v${APP_VERSION} • ${getBuildDate()}`;
}; 