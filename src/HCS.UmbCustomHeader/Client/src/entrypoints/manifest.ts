export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'Grouped Navigation Entrypoint',
    alias: 'HCS.UmbCustomHeader.Entrypoint',
    type: 'backofficeEntryPoint',
    js: () => import('./entrypoint.js'),
  },
  {
    name: 'Grouped Navigation English',
    alias: 'HCS.UmbCustomHeader.Localization.En',
    type: 'localization',
    weight: -100,
    meta: { culture: 'en', localizations: {} },
    js: () => import('../lang/en.js'),
  } as UmbExtensionManifest,
];
