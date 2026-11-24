import { defineTexts } from '@konnekt/rules/language';

// The first-connection flow's loading state, in both languages (spec 009, R1; glossary G§2
// "Loading your connections…", "Create your first connection")
export const FIRST_CONNECTION_COPY = defineTexts(
  {
    // The loading state's text, as the homepage's loading page has it (U10 6401:28567)
    loading: 'Loading your connections…',
    // The page's h1 while it loads, for screen readers: step 1's title in the first-connection flow
    title: 'Create your first connection',
  },
  {
    loading: 'Ihre Anbindungen werden geladen …',
    title: 'Erstellen Sie Ihre erste Anbindung',
  }
);
