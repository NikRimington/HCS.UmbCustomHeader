import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNavModel, isItemActive, type GroupedNavConfig, type NavItem } from './nav-model.js';

const s = (alias: string, weight?: number) => ({ alias, weight });
const cfg = (groups: GroupedNavConfig['groups'], enabled = true): GroupedNavConfig => ({ enabled, groups });
const g = (alias: string, sections: string[], weight?: number) => ({ alias, label: alias, sections, weight });

/** Compact form: section alias, or `alias[a,b]` for groups. */
const shape = (items: NavItem[]) =>
  items.map((i) => (i.kind === 'section' ? i.manifest.alias : `${i.group.alias}[${i.members.map((m) => m.alias).join(',')}]`));

// Mirrors the real registry: higher weight first.
const core = [s('content', 1000), s('media', 900), s('settings', 800), s('packages', 700), s('users', 600), s('members', 500)];

afterEach(() => vi.restoreAllMocks());

describe('buildNavModel passthrough', () => {
  it('passes sections through when config is undefined', () => {
    expect(shape(buildNavModel(core, undefined))).toEqual(['content', 'media', 'settings', 'packages', 'users', 'members']);
  });

  it('passes sections through when disabled', () => {
    expect(shape(buildNavModel(core, cfg([g('m', ['settings', 'users'])], false)))).toEqual(shape(buildNavModel(core, undefined)));
  });

  it('passes sections through when there are no groups', () => {
    expect(shape(buildNavModel(core, cfg([])))).toHaveLength(6);
  });
});

describe('buildNavModel grouping', () => {
  it('orders members by config and places the group at its highest-weight member', () => {
    const result = buildNavModel(core, cfg([g('m', ['members', 'settings', 'users'])]));
    expect(shape(result)).toEqual(['content', 'media', 'm[members,settings,users]', 'packages']);
  });

  it('removes groups with no visible members', () => {
    expect(shape(buildNavModel(core, cfg([g('addons', ['forms', 'commerce'])])))).toHaveLength(6);
  });

  it('renders a group with one visible member as a plain section', () => {
    const result = buildNavModel(core, cfg([g('m', ['settings', 'forms'])]));
    expect(shape(result)).toEqual(['content', 'media', 'settings', 'packages', 'users', 'members']);
    expect(result[2].kind).toBe('section');
  });

  it('ignores unknown aliases inside a group with 2+ members', () => {
    expect(shape(buildNavModel(core, cfg([g('m', ['nope', 'settings', 'users'])])))).toContain('m[settings,users]');
  });

  it('puts a duplicated section in the first group only and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = buildNavModel(core, cfg([g('one', ['settings', 'users']), g('two', ['users', 'members'])]));
    expect(shape(result)).toEqual(['content', 'media', 'one[settings,users]', 'packages', 'members']);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('keeps ungrouped sections in their original order', () => {
    const result = buildNavModel([s('a', 30), s('x', 20), s('b', 10), s('y', 5)], cfg([g('G', ['a', 'b'])]));
    expect(shape(result)).toEqual(['G[a,b]', 'x', 'y']);
  });
});

describe('buildNavModel placement', () => {
  const forms = s('forms', 0);
  const commerce = s('commerce', 850);
  const addons = g('addons', ['forms', 'commerce', 'workflow']);
  const known = [...core, forms, commerce, s('workflow', 0)];

  it('uses the highest member weight', () => {
    const visible = [...core, forms, commerce].sort((a, b) => b.weight! - a.weight!);
    expect(shape(buildNavModel(visible, cfg([addons]), known))).toEqual(['content', 'media', 'addons[forms,commerce]', 'settings', 'packages', 'users', 'members']);
  });

  it('keeps the group in the same place when the user cannot see the heaviest member', () => {
    // Without access to commerce the group must not drift to the end of the bar.
    const visible = [...core, forms, s('workflow', 0)];
    expect(shape(buildNavModel(visible, cfg([addons]), known))).toEqual(['content', 'media', 'addons[forms,workflow]', 'settings', 'packages', 'users', 'members']);
  });

  it('is identical for every user for ungrouped sections', () => {
    const full = shape(buildNavModel(core, cfg([addons]), known));
    const trimmed = shape(buildNavModel(core.filter((c) => c.alias !== 'media'), cfg([addons]), known));
    expect(trimmed).toEqual(full.filter((a) => a !== 'media'));
  });

  it('prefers the configured weight', () => {
    const result = buildNavModel(core, cfg([g('G', ['settings', 'users'], 950)]));
    expect(shape(result)).toEqual(['content', 'G[settings,users]', 'media', 'packages', 'members']);
  });

  it('places a group last when lighter than everything', () => {
    expect(shape(buildNavModel([s('a', 10), s('b', 5), s('c', 4)], cfg([g('G', ['b', 'c'], -1)])))).toEqual(['a', 'G[b,c]']);
  });

  it('orders groups against each other by weight', () => {
    const sections = [s('a', 100), s('b', 50), s('c', 40), s('d', 30), s('e', 20)];
    const result = buildNavModel(sections, cfg([g('G1', ['b', 'c']), g('G2', ['d', 'e'], 55)]));
    expect(shape(result)).toEqual(['a', 'G2[d,e]', 'G1[b,c]']);
  });

  it('places a weighted single-member group as a plain section by weight', () => {
    expect(shape(buildNavModel([s('a', 100), s('b', 10), s('c', 5)], cfg([g('G', ['c', 'zzz'], 50)])))).toEqual(['a', 'c', 'b']);
  });

  it('treats missing weights as 0', () => {
    const result = buildNavModel([s('a'), s('b', 5), s('c', -5)], cfg([g('G', ['b', 'c'], 1)]));
    expect(shape(result)).toEqual(['G[b,c]', 'a']);
  });

  it('places after existing items on equal weight', () => {
    expect(shape(buildNavModel([s('a'), s('b'), s('c')], cfg([g('G', ['b', 'c'])])))).toEqual(['a', 'G[b,c]']);
  });

  it('drops groups with no visible members', () => {
    expect(shape(buildNavModel([s('a')], cfg([g('G', ['x', 'y'], 5)])))).toEqual(['a']);
  });
});

describe('isItemActive', () => {
  const group: NavItem = { kind: 'group', group: g('G', ['a', 'b']), members: [s('a'), s('b')] };
  const section: NavItem = { kind: 'section', manifest: s('c') };

  it('matches group members', () => expect(isItemActive(group, 'b')).toBe(true));
  it('matches sections', () => expect(isItemActive(section, 'c')).toBe(true));
  it('does not match others', () => {
    expect(isItemActive(group, 'c')).toBe(false);
    expect(isItemActive(section, undefined)).toBe(false);
  });
});
