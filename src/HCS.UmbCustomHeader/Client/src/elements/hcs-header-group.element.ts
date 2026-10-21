import { css, customElement, html, ifDefined, nothing, property, repeat } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { ManifestSection } from '@umbraco-cms/backoffice/section';

export type HcsSectionClickHandler = (event: MouseEvent, manifest: ManifestSection) => void;

let nextId = 0;

/** A top-level tab that opens a dropdown of its member sections. */
@customElement('hcs-header-group')
export class HcsHeaderGroupElement extends UmbLitElement {
  @property() groupAlias = '';
  @property() label = '';
  @property() icon?: string;
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ attribute: false }) members: ManifestSection[] = [];
  @property() activeAlias?: string;
  @property({ attribute: false }) onSectionClick?: HcsSectionClickHandler;

  readonly #popoverId = `hcs-group-${nextId++}`;

  #close() {
    this.shadowRoot?.querySelector<HTMLElement>(`#${this.#popoverId}`)?.hidePopover?.();
  }

  #onItemClick(event: MouseEvent, manifest: ManifestSection) {
    this.onSectionClick?.(event, manifest);
    this.#close();
  }

  #onMenuKeydown(event: KeyboardEvent) {
    const items = Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>('uui-menu-item') ?? []);
    const index = items.findIndex((i) => i === (event.target as HTMLElement).closest('uui-menu-item'));
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Escape') {
      this.#close();
      this.shadowRoot?.querySelector<HTMLElement>('#trigger')?.focus();
    }
  }

  #onToggle(event: Event) {
    const open = (event as ToggleEvent).newState === 'open';
    this.shadowRoot?.querySelector('#trigger')?.setAttribute('aria-expanded', String(open));
    if (open) {
      requestAnimationFrame(() => this.shadowRoot?.querySelector<HTMLElement>('uui-menu-item')?.focus());
    }
  }

  override render() {
    const label = this.localize.string(this.label);
    return html`
      <uui-button
        id="trigger"
        compact
        look="default"
        data-mark="group-link:${this.groupAlias}"
        label=${ifDefined(label)}
        aria-haspopup="menu"
        aria-expanded="false"
        popovertarget=${this.#popoverId}>
        ${this.icon ? html`<uui-icon name=${this.icon}></uui-icon>` : nothing}
        <span>${label}</span>
        <uui-icon name="icon-navigation-down"></uui-icon>
      </uui-button>
      <uui-popover-container
        id=${this.#popoverId}
        placement="bottom-start"
        @toggle=${(e: Event) => this.#onToggle(e)}>
        <umb-popover-layout>
          <div role="menu" @keydown=${(e: KeyboardEvent) => this.#onMenuKeydown(e)}>
            ${repeat(
              this.members,
              (m) => m.alias,
              (m) => html`<uui-menu-item
                data-mark="section-link:${m.alias}"
                href="section/${m.meta.pathname}"
                label=${ifDefined(this.localize.string(m.meta.label || m.name))}
                ?active=${m.alias === this.activeAlias}
                @click=${(e: MouseEvent) => this.#onItemClick(e, m)}></uui-menu-item>`,
            )}
          </div>
        </umb-popover-layout>
      </uui-popover-container>
    `;
  }

  static override styles = [
    css`
      :host {
        display: inline-flex;
        align-items: stretch;
        height: 100%;
        position: relative;
      }
      #trigger {
        height: 100%;
        font-size: 16px;
        --uui-button-background-color: transparent;
        --uui-button-background-color-hover: transparent;
        --uui-button-border-width: 0;
        --uui-button-contrast: var(--uui-color-header-contrast);
        --uui-button-contrast-hover: var(--uui-color-header-contrast-emphasis);
        --uui-button-border-radius: 0;
      }
      #trigger span {
        margin-right: var(--uui-size-space-2);
      }
      :host([active]) #trigger {
        --uui-button-contrast: var(--uui-color-header-contrast-emphasis);
      }
      :host([active])::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background-color: var(--uui-color-header-contrast-emphasis);
        border-radius: 3px 3px 0 0;
        pointer-events: none;
      }
      umb-popover-layout > div {
        min-width: 200px;
        display: flex;
        flex-direction: column;
      }
      @media (prefers-reduced-motion: reduce) {
        uui-popover-container {
          transition: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'hcs-header-group': HcsHeaderGroupElement;
  }
}
