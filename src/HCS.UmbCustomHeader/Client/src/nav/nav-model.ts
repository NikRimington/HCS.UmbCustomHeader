export interface NavSection {
  alias: string;
  weight?: number;
}

export interface GroupedNavGroup {
  alias: string;
  label: string;
  icon?: string | null;
  weight?: number | null;
  sections: string[];
}

export interface GroupedNavConfig {
  enabled: boolean;
  groups: GroupedNavGroup[];
}

export type NavItem<S extends NavSection = NavSection> =
  | { kind: 'section'; manifest: S }
  | { kind: 'group'; group: GroupedNavGroup; members: S[] };

/**
 * Turns the permission-filtered, weight-ordered section list into the top-level navigation items.
 * Presentation only: never adds sections, only arranges the ones it is given.
 *
 * A group is positioned by its configured `weight`, or else by the highest weight among its members across
 * `knownSections` (every registered section, not just the ones this user can see). That keeps a group in the
 * same place for every user instead of drifting with whichever members they happen to have access to.
 */
export function buildNavModel<S extends NavSection>(
  sections: S[],
  config: GroupedNavConfig | undefined,
  knownSections: NavSection[] = sections,
): NavItem<S>[] {
  if (!config?.enabled || config.groups.length === 0) {
    return sections.map((manifest) => ({ kind: 'section', manifest }));
  }

  // A section belongs to the first group that lists it.
  const groupOf = new Map<string, GroupedNavGroup>();
  for (const group of config.groups) {
    for (const alias of group.sections) {
      if (groupOf.has(alias)) {
        console.warn(
          `[GroupedNavigation] Section "${alias}" is in more than one group; using "${groupOf.get(alias)!.alias}".`,
        );
        continue;
      }
      groupOf.set(alias, group);
    }
  }

  const byAlias = new Map(sections.map((s) => [s.alias, s]));
  const knownWeight = new Map([...knownSections, ...sections].map((s) => [s.alias, s.weight ?? 0]));

  const entries: { item: NavItem<S>; weight: number }[] = sections
    .filter((s) => !groupOf.has(s.alias))
    .map((manifest) => ({ item: { kind: 'section', manifest }, weight: manifest.weight ?? 0 }));

  for (const group of config.groups) {
    const members = group.sections
      .filter((alias) => groupOf.get(alias) === group)
      .map((alias) => byAlias.get(alias))
      .filter((s): s is S => s !== undefined);
    if (members.length === 0) continue;

    const weight =
      group.weight ?? Math.max(...group.sections.filter((a) => knownWeight.has(a)).map((a) => knownWeight.get(a)!));
    const item: NavItem<S> =
      members.length === 1 ? { kind: 'section', manifest: members[0] } : { kind: 'group', group, members };

    // Higher weight sorts first, same as the extension registry; ties go after existing items.
    const index = entries.findIndex((e) => e.weight < weight);
    entries.splice(index === -1 ? entries.length : index, 0, { item, weight });
  }

  return entries.map((e) => e.item);
}

/** Whether `alias` is the active section or a member of the given item. */
export function isItemActive(item: NavItem, activeAlias: string | undefined): boolean {
  if (!activeAlias) return false;
  return item.kind === 'section'
    ? item.manifest.alias === activeAlias
    : item.members.some((m) => m.alias === activeAlias);
}
