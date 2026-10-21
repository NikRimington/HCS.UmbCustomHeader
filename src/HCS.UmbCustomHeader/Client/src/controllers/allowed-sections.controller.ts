import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbExtensionsManifestInitializer } from '@umbraco-cms/backoffice/extension-api';
import { umbExtensionsRegistry } from '@umbraco-cms/backoffice/extension-registry';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
import { UmbArrayState } from '@umbraco-cms/backoffice/observable-api';
import type { ManifestSection } from '@umbraco-cms/backoffice/section';

/**
 * Public-API replica of core's `UMB_BACKOFFICE_CONTEXT.allowedSections`: section manifests filtered by the
 * current user's group access and the manifest conditions, in registry (weight) order.
 */
export class HcsAllowedSectionsController extends UmbControllerBase {
  readonly #sections = new UmbArrayState<ManifestSection>([], (s) => s.alias);
  readonly sections = this.#sections.asObservable();
  readonly #all = new UmbArrayState<ManifestSection>([], (s) => s.alias);
  /** Every registered section regardless of permissions; used only to position groups consistently. */
  readonly allSections = this.#all.asObservable();
  #initializer?: { destroy(): void };

  constructor(host: UmbControllerHost) {
    super(host);
    this.observe(umbExtensionsRegistry.byType('section'), (all) => this.#all.setValue(all as ManifestSection[]), 'hcsAllSections');
    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (ctx) => {
      this.observe(
        ctx?.allowedSections,
        (allowed) => {
          if (!allowed) return;
          this.#initializer?.destroy();
          this.#initializer = new UmbExtensionsManifestInitializer(
            this,
            umbExtensionsRegistry,
            'section',
            (manifest) => allowed.includes(manifest.alias),
            (sections) => this.#sections.setValue(sections.map((s) => s.manifest as ManifestSection).filter(Boolean)),
            'hcsAllowedSections',
          );
        },
        'hcsAllowedSectionsObserver',
      );
    });
  }
}
