import { registerAllBusinessWidgets } from './businessWidgets';
import { registerAllBusinessReports } from './businessReports';

let initialized = false;

export function initializeBusinessRegistries(): void {
  if (initialized) return;
  registerAllBusinessWidgets();
  registerAllBusinessReports();
  initialized = true;
}

export * from './registry.routes';
export * from './registry.service';
export * from './registry.controller';
