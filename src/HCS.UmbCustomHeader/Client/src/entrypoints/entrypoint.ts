import type { UmbEntryPointOnInit, UmbEntryPointOnUnload } from '@umbraco-cms/backoffice/extension-api';
import type { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { html } from '@umbraco-cms/backoffice/external/lit';
import { UMB_SERVER_CONTEXT } from '@umbraco-cms/backoffice/server';
import { loadGroupedNavConfig } from '../config/config.repository.js';
import '../elements/hcs-header-sections.element.js';

const HEADER_TAG = 'umb-backoffice-header';
const SUPPORTED_MAJOR = 17;
const VERSION_TIMEOUT_MS = 5000;
const EXPECTED_CHILDREN = ['umb-backoffice-header-logo', 'umb-backoffice-header-sections', 'umb-backoffice-header-apps'];

type PatchableRender = { (): unknown; __hcsPatched?: boolean; __hcsOriginal?: () => unknown };

/** Renders the original template once and checks it still has the shape we are replacing. */
function headerLooksAsExpected(render: () => unknown): boolean {
  try {
    const result = render.call({}) as { strings?: readonly string[] };
    const markup = result?.strings?.join('') ?? '';
    return EXPECTED_CHILDREN.every((tag) => markup.includes(`<${tag}>`));
  } catch {
    return false;
  }
}

const proto = (el: unknown) => (el as { prototype: { render: unknown } }).prototype as any;

/** Resolves the server's major version, or undefined if it cannot be determined in time. */
async function serverMajorVersion(host: Parameters<UmbEntryPointOnInit>[0]): Promise<number | undefined> {
  const lookup = (async () => {
    const context = await host.getContext(UMB_SERVER_CONTEXT);
    if (!context) return undefined;
    return new Promise<number | undefined>((resolve) => {
      const subscription = context.serverInformation.subscribe((info) => {
        if (!info?.version) return;
        queueMicrotask(() => subscription.unsubscribe());
        resolve(Number.parseInt(info.version, 10));
      });
    });
  })();
  const timeout = new Promise<undefined>((resolve) => setTimeout(resolve, VERSION_TIMEOUT_MS));
  return Promise.race([lookup, timeout]);
}

function deepQueryAll(selector: string, root: ParentNode = document): Element[] {
  const found: Element[] = [...root.querySelectorAll(selector)];
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) found.push(...deepQueryAll(selector, el.shadowRoot));
  }
  return found;
}

export const onInit: UmbEntryPointOnInit = async (host) => {
  // Start fetching straight away so the config is usually ready by the time the header element renders.
  void loadGroupedNavConfig(host as any);

  const major = await serverMajorVersion(host);
  if (major !== undefined && major !== SUPPORTED_MAJOR) {
    console.warn(`[GroupedNavigation] Umbraco ${major}.x is not supported (needs ${SUPPORTED_MAJOR}.x); using native navigation.`);
    return;
  }

  const Header = (await customElements.whenDefined(HEADER_TAG)) as typeof UmbLitElement;
  const current = proto(Header).render as unknown as PatchableRender;

  if (current.__hcsPatched) return;
  if (!headerLooksAsExpected(current)) {
    console.warn('[GroupedNavigation] Header shape changed or already patched elsewhere; using native navigation.');
    return;
  }

  const patched: PatchableRender = function () {
    return html`<div id="appHeader">
      <umb-backoffice-header-logo></umb-backoffice-header-logo>
      <hcs-header-sections></hcs-header-sections>
      <umb-backoffice-header-apps></umb-backoffice-header-apps>
    </div>`;
  };
  patched.__hcsPatched = true;
  patched.__hcsOriginal = current;
  proto(Header).render = patched;

  for (const el of deepQueryAll(HEADER_TAG)) (el as UmbLitElement).requestUpdate();
};

export const onUnload: UmbEntryPointOnUnload = () => {
  const Header = customElements.get(HEADER_TAG) as typeof UmbLitElement | undefined;
  const current = Header ? (proto(Header).render as PatchableRender) : undefined;
  if (Header && current?.__hcsPatched && current.__hcsOriginal) {
    proto(Header).render = current.__hcsOriginal;
    for (const el of deepQueryAll(HEADER_TAG)) (el as UmbLitElement).requestUpdate();
  }
};
