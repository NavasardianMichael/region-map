import { escapeHtml } from '@/lib/htmlEscape.js';

export type FaqItem = {
  question: string;
  /** May contain `**bold**` markdown-lite, mirroring `client/src/helpers/faqAnswer.tsx`. */
  answer: string;
};

/** Kept in manual sync with `client/src/locales/en.ts` → `common.faq.items` (same pattern as HOME_PAGE_DEFAULT). */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: 'What is Regionify?',
    answer:
      'Regionify is a web application for building interactive **choropleth maps** from your own data. You pick a regional map (countries, states, provinces, and more), import values from **CSV**, **Excel**, **JSON**, or **Google Sheets**, style the legend, and export high-quality images or animations depending on your badge tier.',
  },
  {
    question: 'What is a choropleth map?',
    answer:
      'A **choropleth map** uses colors or shading on predefined **regions** to show how a numeric value varies geographically — for example population density, sales by state, or survey results by country. **Regionify** focuses on this workflow end to end: data import, region matching, styling, and export.',
  },
  {
    question: 'Which file formats can I import?',
    answer:
      'You can import **CSV** and **Excel** spreadsheets, **JSON** data, and connect a **Google Sheet** for **live sync** on supported badge tiers — so your map always reflects live data, not a one-time snapshot. Regionify uses **fuzzy text matching** to associate rows in your data with regions on the map when names are close but not identical.',
  },
  {
    question: 'Which export formats are available?',
    answer:
      'Export options depend on your badge tier. The free **Observer** badge already includes **JPEG**, **PNG**, and **PDF** export with core maps and legends, advanced map styling, and high-resolution (2K/4K) output. The **Explorer** badge adds **SVG** export, historical time-series data with an interactive timeline, an **animated regional map** export (**GIF** and **MP4** video), and an AI data parser. The **Chronographer** badge includes everything in Explorer, plus a public embed (iframe and public page) and a higher daily AI request allowance.',
  },
  {
    question: 'Can I embed a map on my website?',
    answer:
      'Yes. Public embed and **iframe** embedding are available on the **Chronographer** badge — you get a live **embedded regional map** that always shows your current live data, no re-embedding needed when it changes. You can also enable a **public page** per project with optional **SEO** title and description so visitors and search engines see meaningful context around the map.',
  },
  {
    question: 'Is this a subscription?',
    answer:
      'No. Both paid tiers (**Explorer** and **Chronographer**) are one-time payments. Pay once and keep access forever — no recurring charges, no expiry.',
  },
  {
    question: 'How does region matching work?',
    answer:
      'After import, Regionify compares your data labels to the map’s region names using **text similarity**. You can adjust associations in the **visualizer** when automatic matching needs a correction, so the right values land on the right regions.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'Yes. Regionify uses accounts for saving projects, billing, and optional Google sign-in. You can review current badge tiers and limits on the **Pricing** page inside the app.',
  },
  {
    question: 'How do I get help or send feedback?',
    answer:
      'Use the **Contact** page in the app to send a message to the team. For billing issues, the **Pricing** page includes guidance and a link to reach out if something went wrong with checkout.',
  },
] as const;

function renderInline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function plainAnswer(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

/** Visible `<div id="root">` content for `/faq` when Express serves the document (SPA replaces it once mounted). */
export function faqRootInnerHtml(): string {
  const items = FAQ_ITEMS.map(
    (item) => `
        <div class="flex flex-col gap-1">
          <h2 class="text-lg font-semibold text-gray-900">${renderInline(item.question)}</h2>
          <p class="text-gray-600">${renderInline(item.answer)}</p>
        </div>`,
  ).join('');

  return `
    <div class="flex h-full min-h-0 w-full flex-col items-center">
      <div class="flex w-full max-w-4xl flex-col gap-4 p-6">
        <h1 class="text-primary text-2xl font-bold md:text-3xl">Frequently asked questions</h1>
        <p class="text-gray-600">Answers to common questions about choropleth maps, data import, embedding a live regional map, and animated GIF/MP4 export.</p>
        <div class="flex flex-col gap-6">${items}
        </div>
      </div>
    </div>`;
}

/** FAQPage JSON-LD — eligible for search rich results and a strong signal for AI answer-engine citation. */
export function buildFaqJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: plainAnswer(item.answer),
      },
    })),
  };
}
