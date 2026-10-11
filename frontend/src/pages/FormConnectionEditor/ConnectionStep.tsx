import type { FormEvent } from 'react';

import documentBlueIcon from '../../assets/icons/document-blue.svg';
import IconTile from '../../components/IconTile';
import InfoToggletip from '../../components/InfoToggletip';
import PageTitle from '../../components/PageTitle';
import TextField from '../../components/TextField';
import { EDITOR_COPY, ELEMENT_IDS, NAME_MAX_LENGTH, SERVICEBW_FORM_MAX_LENGTH } from './constants';
import type { ConnectionStepProps } from './types';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * Step 1 (Figma "02 Create connection"): the form's name and ID, in the card "UseCase/Create
 * card". The footer's "Continue" submits this form.
 */
export default function ConnectionStep({
  title,
  name,
  servicebwForm,
  errors,
  titleRef,
  onChangeName,
  onChangeServicebwForm,
  onSubmit,
}: ConnectionStepProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <>
      <PageTitle ref={titleRef} title={title} hint={EDITOR_COPY.connectionHint} />
      <form id={ELEMENT_IDS.form} noValidate onSubmit={handleSubmit}>
        <section
          aria-labelledby="form-details-title"
          className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default border"
        >
          <div className="border-kern-neutral-100 flex items-center gap-16 border-b px-24 pt-24 pb-20">
            <IconTile glyph={documentBlueIcon} size={48} tone="blue" />
            <div className="flex min-w-0 flex-col gap-2">
              <h2
                id="form-details-title"
                className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
              >
                {EDITOR_COPY.formCardTitle}
              </h2>
              <p className={`${SMALL_TEXT} text-kern-layout-text-muted`}>
                {EDITOR_COPY.formCardHint}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-24 p-24 md:flex-row md:items-start">
            <div className="min-w-0 flex-1">
              <TextField
                id={ELEMENT_IDS.name}
                label={EDITOR_COPY.nameLabel}
                labelAddon={
                  <InfoToggletip label={EDITOR_COPY.nameInfoLabel} text={EDITOR_COPY.nameInfo} />
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
            <div className="w-full md:w-320 md:shrink-0">
              <TextField
                id={ELEMENT_IDS.servicebwForm}
                label={EDITOR_COPY.formIdLabel}
                labelAddon={
                  <InfoToggletip
                    label={EDITOR_COPY.formIdInfoLabel}
                    text={EDITOR_COPY.formIdInfo}
                    arrow="end"
                  />
                }
                placeholder={EDITOR_COPY.formIdPlaceholder}
                value={servicebwForm}
                maxLength={SERVICEBW_FORM_MAX_LENGTH}
                required
                autoComplete="off"
                spellCheck={false}
                error={errors.servicebwForm}
                onChange={(event) => onChangeServicebwForm(event.target.value)}
              />
            </div>
          </div>
          {/* 7px fits the card's 8px corner inside its border; no overflow clipping, which
              would cut off the tooltips */}
          <div className="border-kern-neutral-100 flex items-center gap-10 rounded-b-[7px] border-t bg-(--kern-color-layout-layer-surface-contextual) px-24 py-16">
            <span aria-hidden="true" className="kern-icon kern-icon--draft" />
            <p className={`${SMALL_TEXT} text-kern-layout-text-muted`}>
              {EDITOR_COPY.formCardNote}
            </p>
          </div>
        </section>
      </form>
    </>
  );
}
