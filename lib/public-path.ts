export const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBasePath(path: string) {
  if (!path.startsWith("/")) {
    return `${publicBasePath}/${path}`;
  }
  return `${publicBasePath}${path}`;
}
