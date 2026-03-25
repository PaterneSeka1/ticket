export const roleToDashboardRouteMap = {
  SUPER_ADMIN: "/dashboard/super-admin",
  ADMIN: "/dashboard/admin",
  USER: "/dashboard/employe",
} as const;

export type UserRole = keyof typeof roleToDashboardRouteMap;

export type DashboardRoute = (typeof roleToDashboardRouteMap)[UserRole];

export const getDashboardRouteForRole = (role: string | undefined): DashboardRoute => {
  if (role && role in roleToDashboardRouteMap) {
    return roleToDashboardRouteMap[role as UserRole];
  }

  return roleToDashboardRouteMap.USER;
};
