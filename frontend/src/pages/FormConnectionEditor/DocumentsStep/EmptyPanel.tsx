import walletStar from '../../../assets/illustrations/wallet-star@2x.png';
import { useCopy } from '../../../hooks/useLanguage';
import { DOCUMENTS_COPY, PANEL_HEIGHT_CLASSES } from './constants';

/**
 * Figma "Ghost · Document data" (U20 7290:60384): the right panel while no document is added, a
 * dashed card with the wallet's star at 128 × 123 (build note U02 #19), "No documents yet" and
 * where the data will show; as high as the list card (U01 #16).
 */
export default function EmptyPanel() {
  const copy = useCopy(DOCUMENTS_COPY);
  return (
    <div
      className={`rounded-kern-large flex min-w-0 flex-1 flex-col items-center justify-center gap-8 border border-dashed border-(--kern-color-decorative-border-default) px-24 py-40 text-center ${PANEL_HEIGHT_CLASSES}`}
    >
      {/* KERN gives every image `height: auto` */}
      <img src={walletStar} alt="" className="h-123! w-128 object-cover" />
      <p className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold">
        {copy.emptyTitle}
      </p>
      <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
        {copy.emptyText}
      </p>
    </div>
  );
}
