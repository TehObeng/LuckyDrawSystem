export const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export function withBasePath(path: string) {
  if (!path || !publicBasePath || ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  if (path === publicBasePath || path.startsWith(`${publicBasePath}/`)) {
    return path;
  }

  if (!path.startsWith("/")) {
    return `${publicBasePath}/${path}`;
  }
  return `${publicBasePath}${path}`;
}
