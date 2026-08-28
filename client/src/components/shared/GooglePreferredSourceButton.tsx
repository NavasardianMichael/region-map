import { useEffect, useRef } from 'react';
import { EXTERNAL_URLS } from '@/constants/routes';

const PREFERRED_SOURCE_BUTTON_ATTRIBUTES = {
  'google-add-preferred-source-btn': '',
} as const;

function findPublisherScript(): HTMLScriptElement | undefined {
  return Array.from(document.scripts).find(
    (script) => script.src === EXTERNAL_URLS.GOOGLE_PREFERRED_SOURCE_SCRIPT,
  );
}

function appendPublisherScript(): void {
  const script = document.createElement('script');
  script.async = true;
  script.src = EXTERNAL_URLS.GOOGLE_PREFERRED_SOURCE_SCRIPT;
  script.addEventListener(
    'load',
    () => {
      script.dataset.loaded = 'true';
    },
    { once: true },
  );
  script.addEventListener(
    'error',
    () => {
      console.error('Failed to load Google Preferred Sources button.');
    },
    { once: true },
  );
  document.head.appendChild(script);
}

type GooglePreferredSourceButtonProps = {
  language: string;
};

export function GooglePreferredSourceButton({
  language,
}: GooglePreferredSourceButtonProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const publisherScript = findPublisherScript();
    if (!publisherScript || publisherScript.dataset.loaded === 'true') {
      appendPublisherScript();
    }
  }, [language]);

  return (
    <div
      key={language}
      ref={containerRef}
      {...PREFERRED_SOURCE_BUTTON_ATTRIBUTES}
      data-theme="light"
      data-lang={language}
    />
  );
}
