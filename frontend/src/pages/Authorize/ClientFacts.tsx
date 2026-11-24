import { useCopy } from '../../hooks/useLanguage';
import { CONSENT_COPY, FACT_EMPHASIS_CLASSES, SMALL_TEXT } from './constants';
import type { ClientFactsProps, EmphasizedFactProps } from './types';
import { nameSourceOf, redirectTargetOf } from './utils';

/** A sentence with a host or a scheme in it, set off in the text colour */
function EmphasizedFact({ before, emphasis, after }: EmphasizedFactProps) {
  return (
    <>
      {before} <strong className={FACT_EMPHASIS_CLASSES}>{emphasis}</strong>
      {after}
    </>
  );
}

/**
 * What the member can check about the client before deciding (spec 012, research R6, finding
 * 6), under the intro as the page's supporting text (body/small, muted, as the footer line): that
 * the name is the client's own (it registered itself, or publishes the name on its host), and
 * where the browser takes the answer, "Allow" or "Deny" alike (`redirectTargetOf`: a host, an
 * app on this computer, or the scheme of an app's own links). Only the host or the scheme of the
 * redirect URI is shown, never the URI with its query. A hint, not a warning: no colour, no icon.
 */
export default function ClientFacts({ client, redirectUri }: ClientFactsProps) {
  const copy = useCopy(CONSENT_COPY);
  const source = nameSourceOf(client);
  const target = redirectTargetOf(redirectUri);
  return (
    <p className={`text-kern-layout-text-muted text-pretty break-words ${SMALL_TEXT}`}>
      {source.kind === 'published' ? (
        <EmphasizedFact
          before={copy.namePublished}
          emphasis={source.host}
          after={copy.namePublishedEnd}
        />
      ) : (
        copy.nameRegistered
      )}
      {target.kind === 'web' && (
        <>
          {' '}
          <EmphasizedFact
            before={copy.goesToWeb}
            emphasis={target.host}
            after={copy.goesToWebEnd}
          />
        </>
      )}
      {target.kind === 'loopback' && ` ${copy.goesToLoopback}`}
      {target.kind === 'app' && (
        <>
          {' '}
          <EmphasizedFact
            before={copy.goesToApp}
            emphasis={target.scheme}
            after={copy.goesToAppEnd}
          />
        </>
      )}
    </p>
  );
}
