import CopyableUrl from '../../components/CopyableUrl';
import { ACCOUNT_COPY, TOKEN_COPY_TEXTS } from './constants';
import type { TokenCopyFieldProps } from './types';

/**
 * The new token in `CopyableUrl`'s labelled read-only field (T028's `field` variant; FR-048): the
 * button reads "✓ Copied" for 2 s and "Token copied" is announced; if copying fails, the token is
 * selected so that it can be copied by hand, and that is announced. The token is never stored,
 * logged or put in a URL: it lives in this field until the dialog closes
 */
export default function TokenCopyField({ token, describedBy }: TokenCopyFieldProps) {
  return (
    <CopyableUrl
      variant="field"
      value={token}
      label={ACCOUNT_COPY.tokenLabel}
      describedBy={describedBy}
      texts={TOKEN_COPY_TEXTS}
    />
  );
}
