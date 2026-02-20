interface UserStatusShape {
  isActive?: boolean | null;
  isDeleted?: boolean | null;
}

/**
 * Treat missing legacy flags as active/not-deleted to avoid false lockouts
 * while still honoring explicit deactivation/deletion.
 */
export function isUserAllowed(user: UserStatusShape | null | undefined): boolean {
  if (!user) {
    return false;
  }

  const isDeleted = user.isDeleted === true;
  const isActive = user.isActive !== false;
  return isActive && !isDeleted;
}

