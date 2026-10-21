import { css, customElement, html, ifDefined, nothing, repeat, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { ManifestSection } from '@umbraco-cms/backoffice/section';
import { loadGroupedNavConfig } from '../config/config.repository.js';
import { HcsActiveSectionController } from '../controllers/active-section.controller.js';
import { HcsAllowedSectionsController } from '../controllers/allowed-sections.controller.js';
import { buildNavModel, isItemActive, type GroupedNavConfig, type NavItem } from '../nav/nav-model.js';
import './hcs-header-group.element.js';

const sectionPath = (m: ManifestSection) => `section/${m.meta.pathname}`;

/** Replacement for `umb-backoffice-header-sections` that supports grouped sections. */
@customElement('hcs-header-sections')
export class HcsHeaderSectionsElement extends UmbLitElement {
  @state() private _sections: ManifestSection[] = [];
  @state() private _allSections: ManifestSection[] = [];
  @state() private _configLoaded = false;
  @state() private _config?: GroupedNavConfig;
  @state() private _activeAlias?: string;
  @state() private _overflowCount = 0;

  readonly #active = new HcsActiveSectionController(this);
  readonly #allowed = new HcsAllowedSectionsController(this);
  readonly #sectionPathMap = new Map<string, string>();
  #resizeObserver?: ResizeObserver;

  constructor() {
    super();
    this.observe(
      this.#allowed.sections,
      (sections) => {
        this._sections = sections;
        this.#active.setPathnames(new Map(sections.map((s) => [s.alias, s.meta.pathname])));
      },
      'hcsObserveSections',
    );
    this.observe(this.#allowed.allSections, (all) => (this._allSections = all), 'hcsObserveAllSections');
    this.observe(this.#active.alias, (alias) => (this._activeAlias = alias ?? ''), 'hcsObserveActive');
    // Until the config settles, render no tabs: showing the flat list first makes the bar reshuffle.
    loadGroupedNavConfig(this).then((config) => {
      this._config = config;
      this._configLoaded = true;
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    this.#resizeObserver = new ResizeObserver(() => this.#measure());
    this.#resizeObserver.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#resizeObserver?.disconnect();
  }

  protected override updated() {
    this.#measure();
  }

  get #items(): NavItem<ManifestSection>[] {
    return buildNavModel(this._sections, this._config, this._allSections);
  }

  /** Hide trailing items that do not fit; they are listed in the "More" menu instead. */
  #measure() {
    const bar = this.shadowRoot?.querySelector<HTMLElement>('#tabs');
    if (!bar) return;
    const entries = Array.from(bar.querySelectorAll<HTMLElement>(':scope > .entry'));
    entries.forEach((e) => e.removeAttribute('hidden'));
    const more = bar.querySelector<HTMLElement>('#more');
    const moreWidth = more ? more.offsetWidth || 90 : 90;
    const available = bar.clientWidth;
    const total = entries.reduce((sum, e) => sum + e.offsetWidth, 0);
    let hiddenCount = 0;
    if (total > available) {
      let used = moreWidth;
      let visible = 0;
      for (const entry of entries) {
        if (used + entry.offsetWidth > available) break;
        used += entry.offsetWidth;
        visible++;
      }
      hiddenCount = entries.length - visible;
      entries.slice(visible).forEach((e) => e.setAttribute('hidden', ''));
    }
    if (hiddenCount !== this._overflowCount) this._overflowCount = hiddenCount;
  }

  #onSectionClick = (event: MouseEvent, manifest: ManifestSection) => {
    // Let the browser handle the click if the Ctrl or Meta key is pressed
    if (event.ctrlKey || event.metaKey) return;
    event.stopPropagation();
    event.preventDefault();

    // Store the current path for the section so we can redirect to it next time the section is visited
    if (this._activeAlias) this.#sectionPathMap.set(this._activeAlias, window.location.pathname);

    // preventUrlRetention, or clicking the active section, goes to the section root.
    if (manifest.meta.preventUrlRetention === true || this._activeAlias === manifest.alias) {
      history.pushState(null, '', sectionPath(manifest));
    } else {
      history.pushState(null, '', this.#sectionPathMap.get(manifest.alias) ?? sectionPath(manifest));
    }
    this.#active.notifyNavigated();
  };

  #label(m: ManifestSection) {
    return this.localize.string(m.meta.label || m.name);
  }

  override render() {
    const items = this._configLoaded ? this.#items : [];
    return html`
      <div id="tabs" role="tablist" data-mark="section-links">
        ${repeat(
          items,
          (item) => (item.kind === 'section' ? item.manifest.alias : `group:${item.group.alias}`),
          (item) => html`<div class="entry" role="presentation">${this.#renderItem(item)}</div>`,
        )}
        ${this._overflowCount > 0 ? this.#renderMore(items) : nothing}
      </div>
    `;
  }

  #renderItem(item: NavItem<ManifestSection>) {
    if (item.kind === 'group') {
      return html`<hcs-header-group
        groupAlias=${item.group.alias}
        label=${item.group.label}
        icon=${ifDefined(item.group.icon ?? undefined)}
        activeAlias=${ifDefined(this._activeAlias)}
        ?active=${isItemActive(item, this._activeAlias)}
        .members=${item.members}
        .onSectionClick=${this.#onSectionClick}></hcs-header-group>`;
    }
    const m = item.manifest;
    return html`<uui-tab
      data-mark="section-link:${m.alias}"
      href=${sectionPath(m)}
      label=${ifDefined(this.#label(m))}
      ?active=${this._activeAlias === m.alias}
      @click=${(e: MouseEvent) => this.#onSectionClick(e, m)}></uui-tab>`;
  }

  #renderMore(items: NavItem<ManifestSection>[]) {
    const hidden = items.slice(items.length - this._overflowCount);
    return html`
      <div id="more">
        <uui-button compact look="default" label="More" popovertarget="hcs-more" aria-haspopup="menu">
          <span>${this.localize.term('groupedNav_more')}</span>
          <uui-icon name="icon-navigation-down"></uui-icon>
        </uui-button>
        <uui-popover-container id="hcs-more" placement="bottom-end">
          <umb-popover-layout>
            <div role="menu" class="more-menu">
              ${hidden.flatMap((item) =>
                (item.kind === 'section' ? [item.manifest] : item.members).map(
                  (m) => html`<uui-menu-item
                    data-mark="section-link:${m.alias}"
                    href=${sectionPath(m)}
                    label=${ifDefined(this.#label(m))}
                    ?active=${m.alias === this._activeAlias}
                    @click=${(e: MouseEvent) => this.#onSectionClick(e, m)}></uui-menu-item>`,
                ),
              )}
            </div>
          </umb-popover-layout>
        </uui-popover-container>
      </div>
    `;
  }

  static override styles = [
    css`
      :host {
        display: flex;
        flex: 1 1 auto;
        min-width: 0;
      }
      #tabs {
        display: flex;
        align-items: stretch;
        height: 60px;
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        font-size: 16px; /* specific for the header */
        background-color: var(--uui-color-header-background);
        --uui-tab-text: var(--uui-color-header-contrast);
        --uui-tab-text-hover: var(--uui-color-header-contrast-emphasis);
        --uui-tab-text-active: var(--uui-color-header-contrast-emphasis);
      }
      .entry {
        display: flex;
        flex: 0 0 auto;
      }
      .entry[hidden] {
        display: none;
      }
      #more {
        display: flex;
        margin-left: auto;
        align-items: stretch;
        --uui-button-background-color: transparent;
        --uui-button-background-color-hover: transparent;
        --uui-button-border-width: 0;
        --uui-button-contrast: var(--uui-color-header-contrast);
        --uui-button-contrast-hover: var(--uui-color-header-contrast-emphasis);
        --uui-button-border-radius: 0;
      }
      .more-menu {
        min-width: 200px;
        display: flex;
        flex-direction: column;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'hcs-header-sections': HcsHeaderSectionsElement;
  }
}
