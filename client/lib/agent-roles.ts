import { Code2, FileText, Mic, Package, Terminal } from 'lucide-react';
import { showsProductCatalog } from './archetypes';
import type { LucideIcon } from 'lucide-react';

/**
 * The roles and views of the Agent Configuration workspace.
 *
 * These used to live in `components/agent/agent-section-nav.tsx` alongside a
 * second sub-sidebar that duplicated the dashboard sidebar's own tree. That
 * component is gone; the constants moved here so navigation has one home and
 * no component has to import another component to render a link.
 */

export type AgentRole = 'prompt' | 'voice' | 'documents' | 'products' | 'script';
export type AgentView =
  | 'get-started'
  | 'feed'
  | 'test'
  | 'knowledge'
  | 'catalog'
  | 'prompt'
  | 'script';

export interface AgentRoleOption {
  id: AgentRole;
  label: string;
  Icon: LucideIcon;
  iconClass: string;
}

export const ROLES: AgentRoleOption[] = [
  { id: 'prompt', label: 'System Prompt & Persona', Icon: Terminal, iconClass: 'text-foreground' },
  { id: 'voice', label: 'Talk to ORA', Icon: Mic, iconClass: 'text-foreground' },
  { id: 'documents', label: 'Documents', Icon: FileText, iconClass: 'text-foreground' },
  { id: 'products', label: 'Product Catalog', Icon: Package, iconClass: 'text-foreground' },
  // The embed snippet used to live in the Get Set Up guide's "Widget embed"
  // step. That guide is switched off, so the script has its own page here.
  { id: 'script', label: 'Widget Embed', Icon: Code2, iconClass: 'text-foreground' },
];

/**
 * Roles that are not offered to every business.
 *
 * Not every business sells from a catalogue, so the Product Catalog role is
 * shown on the same evidence the backend uses to decide whether the agent gets
 * cart and checkout tools at all.
 */
export function getVisibleRoles(context: {
  archetype?: unknown;
  hasCatalog?: boolean;
}): AgentRoleOption[] {
  const catalog = showsProductCatalog(context);
  return ROLES.filter((role) => role.id !== 'products' || catalog);
}

export function isRoleVisible(
  role: AgentRole,
  context: { archetype?: unknown; hasCatalog?: boolean },
): boolean {
  return getVisibleRoles(context).some((r) => r.id === role);
}

/**
 * The views each role offers.
 *
 * DISABLED: the editorial `get-started` entries are commented out rather than
 * deleted — see lib/disabled-features.ts. They sat in front of every role as an
 * extra click before the page that does the work.
 */
export const TRAIN_ITEMS: Record<AgentRole, { view: AgentView; label: string }[]> = {
  prompt: [{ view: 'prompt', label: 'System prompt' }],
  voice: [
    // { view: 'get-started', label: 'Get started' },
    { view: 'feed', label: 'Voice feed' },
    // DISABLED: the standalone "Test ORA" page — see lib/disabled-features.ts.
    // Testing now happens through the Test Voice button on the persona page,
    // which opens the same live call in a modal.
    // { view: 'test', label: 'Test ORA' },
  ],
  documents: [
    // { view: 'get-started', label: 'Get started' },
    { view: 'feed', label: 'Upload files' },
    // { view: 'test', label: 'Test ORA' },
  ],
  products: [
    // { view: 'get-started', label: 'Get started' },
    { view: 'catalog', label: 'Sync catalog' },
  ],
  script: [{ view: 'script', label: 'Widget Embed Snippet' }],
};

/**
 * Where a role opens. Previously every role but `prompt` landed on its
 * `get-started` page; they now open straight onto their main feature page.
 */
export const ROLE_LANDING_VIEW: Record<AgentRole, AgentView> = {
  prompt: 'prompt',
  voice: 'feed',
  documents: 'feed',
  products: 'catalog',
  script: 'script',
};

/** The role `/agent` opens when none is named. */
export const DEFAULT_AGENT_ROLE: AgentRole = 'prompt';

export const AGENT_VIEWS: AgentView[] = [
  'get-started',
  'feed',
  'test',
  'knowledge',
  'catalog',
  'prompt',
  'script',
];
