/** Augment React HTML attributes only (no `import 'react'` — that can break interface merges). */
export {};

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    'data-i18n-key'?: string;
    'google-add-preferred-source-btn'?: string;
  }
}
