import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UmbContextToken, type UmbContextMinimal } from '@umbraco-cms/backoffice/context-api';
import { UmbStringState } from '@umbraco-cms/backoffice/observable-api';
import type { Observable } from '@umbraco-cms/backoffice/external/rxjs';

interface BackofficeContextLike extends UmbContextMinimal {
  activeSectionAlias: Observable<string | undefined>;
}

// UMB_BACKOFFICE_CONTEXT is not exported publicly; contexts resolve by alias string.
const BACKOFFICE_CONTEXT = new UmbContextToken<BackofficeContextLike>('UmbBackofficeContext');

/** Resolves the active section alias from core's context, falling back to matching the URL. */
export class HcsActiveSectionController extends UmbControllerBase {
  readonly #alias = new UmbStringState<string | undefined>(undefined);
  readonly alias = this.#alias.asObservable();
  #contextResolved = false;
  #pathnames = new Map<string, string>();

  constructor(host: UmbControllerHost) {
    super(host);
    this.consumeContext(BACKOFFICE_CONTEXT, (ctx) => {
      if (!ctx) return;
      this.#contextResolved = true;
      this.observe(ctx.activeSectionAlias, (alias) => this.#alias.setValue(alias), 'hcsActiveSection');
    });
    window.addEventListener('popstate', this.#onNavigate);
  }

  /** Register section pathnames so the URL fallback can work if the core context is unavailable. */
  setPathnames(map: Map<string, string>) {
    this.#pathnames = map;
    this.#onNavigate();
  }

  /** Call after our own `history.pushState`, which does not raise popstate. */
  notifyNavigated() {
    queueMicrotask(this.#onNavigate);
  }

  #onNavigate = () => {
    if (this.#contextResolved) return;
    const match = window.location.pathname.match(/\/section\/([^/]+)/);
    const pathname = match?.[1];
    for (const [alias, path] of this.#pathnames) {
      if (path === pathname) return this.#alias.setValue(alias);
    }
    this.#alias.setValue(undefined);
  };

  override destroy() {
    window.removeEventListener('popstate', this.#onNavigate);
    super.destroy();
  }
}
