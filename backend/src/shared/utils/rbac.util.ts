export const hasRole = (roles: string[], ...targets: string[]): boolean =>
  roles.some((r) => targets.map((t) => t.toLowerCase()).includes(r.toLowerCase()));
