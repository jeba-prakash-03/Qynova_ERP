import { TokenUserPayload } from '../utils/jwt.util';
import { ForbiddenError, NotFoundError } from '../errors/app-error';
import { SYSTEM_ROLES } from '../constants/roles';
import { DashboardWidgetDefinition } from './types';

const widgetRegistry = new Map<string, DashboardWidgetDefinition>();

export function registerDashboardWidget(widget: DashboardWidgetDefinition): void {
  widgetRegistry.set(widget.key, widget);
}

export function isUserAuthorizedForWidget(widget: DashboardWidgetDefinition, user: TokenUserPayload): boolean {
  const isAdmin = user.roles.some(
    (r) => r.toLowerCase() === SYSTEM_ROLES.ADMIN.toLowerCase() || r === '*'
  );
  if (isAdmin) {
    return true;
  }

  // Check roles if defined
  if (widget.roles && widget.roles.length > 0) {
    const hasRole = widget.roles.some((reqRole) =>
      user.roles.some((userRole) => userRole.toLowerCase() === reqRole.toLowerCase())
    );
    if (!hasRole) {
      return false;
    }
  }

  // Check permission if defined
  if (widget.permission) {
    const hasPerm =
      user.permissions.includes(widget.permission) ||
      user.permissions.includes('*');
    if (!hasPerm) {
      return false;
    }
  }

  return true;
}

export function getDashboardWidgets(user: TokenUserPayload): Array<{ key: string; title: string }> {
  const authorized: Array<{ key: string; title: string }> = [];
  for (const widget of widgetRegistry.values()) {
    if (isUserAuthorizedForWidget(widget, user)) {
      authorized.push({
        key: widget.key,
        title: widget.title,
      });
    }
  }
  return authorized;
}

export async function executeDashboardWidget(
  key: string,
  user: TokenUserPayload,
  query?: any
): Promise<any> {
  const widget = widgetRegistry.get(key);
  if (!widget) {
    throw new NotFoundError(`Dashboard widget '${key}' not found`);
  }

  if (!isUserAuthorizedForWidget(widget, user)) {
    throw new ForbiddenError(`You do not have permission to access dashboard widget '${key}'`);
  }

  return await widget.handler(user, query);
}

export function getAllRegisteredWidgets(): DashboardWidgetDefinition[] {
  return Array.from(widgetRegistry.values());
}
