import { languageNames } from '@connection-portal/rules/language';

import { useCopy, useLanguage } from '../../hooks/useLanguage';
import {
  CURRENT_SEGMENT_CLASSES,
  LANGUAGE_LABELS,
  LANGUAGE_SWITCH_COPY,
  OTHER_SEGMENT_CLASSES,
  SEGMENT_CLASSES,
  SWITCH_CLASSES,
  SWITCH_ORDER,
} from './constants';
import type { LanguageSegmentProps } from './types';

/**
 * Figma "Pill · Language (globe + DE | EN)" (7341:101654; spec 009, research R2): the header's
 * DE | EN pill, the current language white. Each button is named by its language's own name,
 * spoken in that language (FR-011); the current one is marked `aria-current` and stays a Tab stop.
 * Choosing the other language switches every screen at once, without a request, a navigation or a
 * remount (FR-003). The design's globe is hidden in every frame and not built
 */
export default function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const copy = useCopy(LANGUAGE_SWITCH_COPY);
  return (
    <div role="group" aria-label={copy.language} className={SWITCH_CLASSES}>
      {SWITCH_ORDER.map((code) => (
        <LanguageSegment
          key={code}
          code={code}
          current={code === language}
          onChoose={setLanguage}
        />
      ))}
    </div>
  );
}

/** One language's button: "DE" (7341:101656) or "EN" (7341:101658) */
function LanguageSegment({ code, current, onChoose }: LanguageSegmentProps) {
  return (
    <button
      type="button"
      lang={code}
      aria-label={languageNames[code]}
      aria-current={current ? 'true' : undefined}
      className={`${SEGMENT_CLASSES} ${current ? CURRENT_SEGMENT_CLASSES : OTHER_SEGMENT_CLASSES}`}
      onClick={current ? undefined : () => onChoose(code)}
    >
      {LANGUAGE_LABELS[code]}
    </button>
  );
}
