import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type { GroupedNavConfig } from '../nav/nav-model.js';

const CONFIG_PATH = '/umbraco/management/api/v1/grouped-navigation/config';

/**
 * Fetches the grouped navigation config using the backoffice auth context.
 * Resolves to `undefined` on any failure so callers fall back to the native flat list.
 */
async function fetchGroupedNavConfig(host: UmbControllerHost & { getContext: any }): Promise<GroupedNavConfig | undefined> {
  try {
    const auth = await host.getContext(UMB_AUTH_CONTEXT);
    if (!auth) return undefined;
    const api = auth.getOpenApiConfiguration();
    const response = await fetch(`${api.base}${CONFIG_PATH}`, {
      credentials: api.credentials,
      headers: { Authorization: `Bearer ${await api.token()}` },
    });
    if (!response.ok) return undefined;
    const body = await response.json();
    return {
      enabled: body.enabled === true,
      groups: Array.isArray(body.groups) ? body.groups : [],
    };
  } catch (error) {
    console.warn('[GroupedNavigation] Could not load config; using native navigation.', error);
    return undefined;
  }
}

let pending: Promise<GroupedNavConfig | undefined> | undefined;

/** Shared, memoised load so the entry point can start the request before the header element exists. */
export function loadGroupedNavConfig(host: UmbControllerHost & { getContext: any }) {
  // Never leave the bar empty: if the config cannot be had in time, fall back to the native flat list.
  const timeout = new Promise<undefined>((resolve) => setTimeout(resolve, 5000));
  return (pending ??= Promise.race([fetchGroupedNavConfig(host), timeout]));
}
