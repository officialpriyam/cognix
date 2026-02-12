export const USER_ROLES = {
  ADMIN: "admin",
  EDITOR: "editor",
  USER: "user",
} as const;
export type UserRoleNames = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Default user role for new registrations

export const DEFAULT_USER_ROLE: UserRoleNames =
  process.env.DEFAULT_USER_ROLE &&
  Object.values(USER_ROLES).includes(
    process.env.DEFAULT_USER_ROLE as UserRoleNames,
  )
    ? (process.env.DEFAULT_USER_ROLE as UserRoleNames)
    : USER_ROLES.USER;

export type UserRolesInfo = Record<
  UserRoleNames,
  {
    label: string;
    description: string;
  }
>;

export const userRolesInfo: UserRolesInfo = {
  admin: {
    label: "Admin",
    description: "Admin user can manage the app",
  },
  editor: {
    label: "Editor",
    description: "Can create agents, workflows and add MCPs",
  },
  user: {
    label: "User",
    description: "Basic user role",
  },
};
