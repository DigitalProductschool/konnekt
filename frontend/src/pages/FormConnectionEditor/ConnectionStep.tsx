import type { FormEvent } from 'react';

import addLinkIcon from '../../assets/icons/add-link-action.svg';
import IconTile from '../../components/IconTile';
import InfoTooltip from '../../components/InfoTooltip';
import TextField from '../../components/TextField';
import { DESCRIPTION_MAX_LENGTH, EDITOR_COPY, ELEMENT_IDS, NAME_MAX_LENGTH } from './constants';
import type { ConnectionStepProps } from './types';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * Step 1 (S7; U19 6699:45321, the edit flow U98 6731:39821): "Connection card (highlight)" under
 * the wizard's step head, with the name and the description. The footer's "Choose documents"
 * submits this form; a refused step shows the message under the field and moves the focus to
 * the first field with a problem (the editor's `refuse()`, through `ELEMENT_IDS`).
 */
export default function ConnectionStep({
  name,
  editing,
  description,
  errors,
  onChangeName,
  onChangeDescription,
  onSubmit,
}: ConnectionStepProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form id={ELEMENT_IDS.form} noValidate onSubmit={handleSubmit}>
      {/* U19 6699:45328: the action-blue 1px border, radius large (12px). No overflow clipping,
          which would cut off the tooltips */}
      <section
        aria-labelledby="form-details-title"
        className="rounded-kern-large border-kern-action-default bg-kern-layout-background-default border"
      >
        {/* U19 6699:45329: 24px around, 16px between the tile and the title */}
        <div className="flex items-center gap-16 border-b border-(--kern-color-decorative-border-default) p-24">
          <IconTile glyph={addLinkIcon} size={40} tone="action" />
          <div className="flex min-w-0 flex-col">
            <h2
              id="form-details-title"
              className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
            >
              {EDITOR_COPY.formCardTitle}
            </h2>
            <p className={`${SMALL_TEXT} text-kern-layout-text-muted break-words`}>
              {editing ? EDITOR_COPY.editFormCardHint : EDITOR_COPY.formCardHint}
            </p>
          </div>
        </div>
        {/* U19 6699:45335: the fields one under the other, 24px apart, 726px wide */}
        <div className="flex flex-col gap-24 p-24">
          <div className="w-full max-w-726">
            <TextField
              id={ELEMENT_IDS.name}
              label={EDITOR_COPY.nameLabel}
              requiredMark
              labelAddon={
                <InfoTooltip
                  label={EDITOR_COPY.nameInfoLabel}
                  text={
                    <>
                      {EDITOR_COPY.nameInfo}
                      <br />
                      {EDITOR_COPY.nameInfoAdvice}
                    </>
                  }
                  iconSize="small"
                />
              }
              placeholder={EDITOR_COPY.namePlaceholder}
              value={name}
              maxLength={NAME_MAX_LENGTH}
              required
              autoComplete="off"
              error={errors.name}
              onChange={(event) => onChangeName(event.target.value)}
            />
          </div>
          <div className="w-full max-w-726">
            <TextField
              multiline
              id={ELEMENT_IDS.description}
              label={EDITOR_COPY.descriptionLabel}
              optional
              labelAddon={
                <InfoTooltip
                  label={EDITOR_COPY.descriptionInfoLabel}
                  text={EDITOR_COPY.descriptionInfo}
                  iconSize="small"
                />
              }
              placeholder={EDITOR_COPY.descriptionPlaceholder}
              value={description}
              maxLength={DESCRIPTION_MAX_LENGTH}
              error={errors.description}
              onChange={(event) => onChangeDescription(event.target.value)}
            />
          </div>
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
          {editing ? EDITOR_COPY.editNote : EDITOR_COPY.draftNote}
        </p>
      </section>
    </form>
  );
}
