export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  description?: string;
  category: 'business' | 'finance' | 'projects' | 'tasks' | 'general' | 'hr';
  permission?: string;
  roles?: string[];
  getData: (user: any, params?: any) => Promise<any>;
}

const widgetRegistry = new Map<string, DashboardWidgetDefinition>();

/**
 * Registers a dashboard widget into the global widget registry.
 */
export function registerDashboardWidget(widget: DashboardWidgetDefinition): void {
  widgetRegistry.set(widget.id, widget);
}

/**
 * Returns all registered widget definitions.
 */
export function getRegisteredWidgets(): DashboardWidgetDefinition[] {
  return Array.from(widgetRegistry.values());
}

/**
 * Returns a specific widget definition by id.
 */
export function getWidgetDefinition(id: string): DashboardWidgetDefinition | undefined {
  return widgetRegistry.get(id);
}

/**
 * Executes a specific widget and returns its data.
 */
export async function executeWidget(id: string, user: any, params?: any): Promise<any> {
  const widget = widgetRegistry.get(id);
  if (!widget) {
    throw new Error(`Widget "${id}" is not registered`);
  }
  return widget.getData(user, params);
}
