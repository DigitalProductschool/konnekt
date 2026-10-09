import PageTitle from '../../components/PageTitle';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { PlaceholderPageProps } from './types';

/** Stands in for a screen that a later phase builds. */
export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  useDocumentTitle(title);
  return <PageTitle title={title} hint="This screen isn’t built yet." />;
}
