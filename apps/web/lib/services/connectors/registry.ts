// Connector Marketplace Registry
// Add new connectors here only — no other files need modification.

import { SchoolCubeConnector } from "./schoolcube";
import { EdvesConnector } from "./edves";
import type { BasePortalConnector, ConnectorMeta } from "./base";

type ConnectorConstructor = new () => BasePortalConnector;

const REGISTRY = new Map<string, ConnectorConstructor>([
  ["schoolcube", SchoolCubeConnector],
  ["edves", EdvesConnector],
]);

export function getConnector(portalType: string): BasePortalConnector {
  const Ctor = REGISTRY.get(portalType);
  if (!Ctor) throw new Error(`No connector registered for portal type: ${portalType}`);
  return new Ctor();
}

export function listConnectors(): ConnectorMeta[] {
  return Array.from(REGISTRY.values()).map((Ctor) => new Ctor().meta);
}

export function isValidPortalType(type: string): boolean {
  return REGISTRY.has(type);
}
