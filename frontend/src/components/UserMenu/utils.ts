/** Initials for the avatar: "laura.weber" becomes "LW", "alice" becomes "A". */
export function initialsOf(username: string): string {
  return username
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
