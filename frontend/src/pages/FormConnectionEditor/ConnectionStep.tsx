import { formatDate } from '@konnekt/rules/dates';
import type { Language } from '@konnekt/rules/language';
import type { FormEvent } from 'react';

import addLinkIcon from '../../assets/icons/add-link-action.svg';
import ExampleBanner from '../../components/ExampleBanner';
import { EXAMPLE_BANNER_COPY } from '../../components/ExampleBanner/constants';
import IconTile from '../../components/IconTile';
import InfoTooltip from '../../components/InfoTooltip';
import TextField from '../../components/TextField';
import { useLanguage } from '../../hooks/useLanguage';
import type { ScheduledEditProps } from '../FormConnectionEdit/types';
import { DESCRIPTION_MAX_LENGTH, EDITOR_COPY, ELEMENT_IDS, NAME_MAX_LENGTH } from './constants';
import type { ConnectionStepProps, ExampleStepProps } from './types';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * Step 1 (S7; U19 6699:45321, the edit flow U98 6731:39821): "Connection card (highlight)" under
 * the wizard's step head, with the name and the description. The footer's "Choose documents"
 * submits this form; a refused step shows the message under the field and moves the focus to
 * the first field with a problem (the editor's `refuse()`, through `ELEMENT_IDS`). Editing a
 * scheduled connection, the card's note says when the saved changes become active (spec 010, S18;
 * FR-013, W7). While the loaded draft is the example, `ExampleBanner` says so above the card, 24px
 * from the step head and from the card (spec 010, S7; FR-058; U18 1h 6793:47711, 6798:122695).
 */
export default function ConnectionStep({
  name,
  editing,
  description,
  errors,
  onChangeName,
  onChangeDescription,
  onSubmit,
  scheduledStart = null,
  isExample = false,
}: ConnectionStepProps & ScheduledEditProps & ExampleStepProps) {
  const { language } = useLanguage();
  const copy = EDITOR_COPY[language];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form id={ELEMENT_IDS.form} noValidate onSubmit={handleSubmit} className="flex flex-col gap-24">
      {isExample && <ExampleBanner text={EXAMPLE_BANNER_COPY[language].connection} />}
      {/* U19 6699:45328: the action-blue 1px border, radius large (12px). No overflow clipping,
          which would cut off the tooltips */}
      <section
        aria-labelledby="form-details-title"
        className="rounded-kern-large border-kern-action-default bg-kern-layout-background-default border"
      >
        {/* U19 6699:45329: 24px around, 16px between the tile and the title */}
        <div className="narrow:flex-col narrow:items-start flex items-center gap-16 border-b border-(--kern-color-decorative-border-default) p-24">
          <IconTile glyph={addLinkIcon} size={40} tone="action" />
          <div className="flex min-w-0 flex-col">
            <h2
              id="form-details-title"
              className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
            >
              {copy.formCardTitle}
            </h2>
            <p className={`${SMALL_TEXT} text-kern-layout-text-muted break-words`}>
              {editing ? copy.editFormCardHint : copy.formCardHint}
            </p>
          </div>
        </div>
        {/* V5 7609:62173 (replacing U19's 726px): the fields one under the other, filling the
            card's column, 24px around and between (1070 wide at 1440) */}
        <div className="flex flex-col gap-24 p-24">
          <TextField
            id={ELEMENT_IDS.name}
            label={copy.nameLabel}
            requiredMark
            labelAddon={
              <InfoTooltip
                label={copy.nameInfoLabel}
                text={<span className="whitespace-pre-line">{copy.nameInfoLines.join('\n')}</span>}
                iconSize="small"
              />
            }
            placeholder={copy.namePlaceholder}
            value={name}
            maxLength={NAME_MAX_LENGTH}
            required
            autoComplete="off"
            error={errors.name}
            onChange={(event) => onChangeName(event.target.value)}
          />
          <TextField
            multiline
            id={ELEMENT_IDS.description}
            label={copy.descriptionLabel}
            optional
            labelAddon={
              <InfoTooltip
                label={copy.descriptionInfoLabel}
                text={copy.descriptionInfo}
                iconSize="small"
              />
            }
            placeholder={copy.descriptionPlaceholder}
            value={description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            error={errors.description}
            onChange={(event) => onChangeDescription(event.target.value)}
          />
        </div>
        {/* The info strip (T048; U19 6699:45346, U98 6731:39846): the info background, the blue
            ⓘ (build note 35), 14/24 text; the draft's note in a new connection's or a stored
            draft's flow, F49's in the edit flow. 11px fits the card's 12px corner inside its
            border */}
        <p
          className={`bg-kern-feedback-info-background text-kern-layout-text-default flex items-center gap-8 rounded-b-[11px] border-t border-(--kern-color-decorative-border-default) px-24 py-8 ${SMALL_TEXT}`}
        >
          <span
            aria-hidden="true"
            className="kern-icon kern-icon--info kern-icon--small bg-kern-feedback-info! shrink-0"
          />
          {editing ? editNoteOf(scheduledStart, copy, language) : copy.draftNote}
        </p>
      </section>
    </form>
  );
}

/** The edit flow's note: F49's, or for a scheduled connection its start date's (W7) */
function editNoteOf(
  scheduledStart: string | null,
  copy: (typeof EDITOR_COPY)['en'],
  language: Language
): string {
  return scheduledStart === null
    ? copy.editNote
    : copy.scheduledEditNote(formatDate(scheduledStart, language));
}
