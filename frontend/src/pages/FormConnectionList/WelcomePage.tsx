import { useReducer } from 'react';
import { generatePath, Link, useNavigate } from 'react-router';

import { createExample } from '../../api/form-connections';
import walletStar from '../../assets/illustrations/wallet-star@2x.png';
import IconTile from '../../components/IconTile';
import PageTitle from '../../components/PageTitle';
import { ROUTES } from '../../constants';
import { useCopy, useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { INITIAL_EXAMPLE_DIALOG_STATE, WELCOME_COPY, WELCOME_STEPS } from './constants';
import ExampleDialog from './ExampleDialog';
import type { WelcomePageProps, WelcomeStepItemProps } from './types';
import { exampleDialogReducer, exampleFailureOf } from './utils';

/**
 * One step of the illustration (U11 6699:44494): the white round tile with the ink glyph and
 * the label 8px after it. From the second step on, the light blue line that joins it to the step
 * before (6699:44498, action blue at 32 %) stretches in front of it, while the steps sit in a
 * row; stacked, the line goes. In the row the item grows from its content's width (`flex-auto`),
 * so that the three lines share the free space equally, as the frame draws them
 */
function WelcomeStepItem({ step, joined }: WelcomeStepItemProps) {
  return (
    <li
      className={`flex items-center gap-16 ${joined ? '@min-[640px]:min-w-0 @min-[640px]:flex-auto' : ''}`}
    >
      {joined && (
        <span
          aria-hidden="true"
          className="bg-kern-action-default hidden h-2 min-w-px flex-1 opacity-32 @min-[640px]:block"
        />
      )}
      <span className="flex shrink-0 items-center gap-8">
        <IconTile glyph={step.glyph} size={48} tone="plain" />
        <span className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap">
          {step.label}
        </span>
      </span>
    </li>
  );
}

/**
 * S3, the welcome page at "/" while no connection or draft exists (Figma U11 6699:44481 "1b";
 * FR-027, design-notes §3 "Empty state"): "Welcome to Konnekt" as the page's h1 (heading/x-large,
 * 6699:44486), then the light blue card (radius 12, padding and gap 48; 6699:44488) with its
 * heading "Create your first connection" (title/large) and the one sentence 8px under it, the four
 * steps 32px under them, "Create connection" with its forward arrow (primary) and, 16px beside
 * it, "Start from an example" (secondary; spec 010, FR-053, 1g U18 6793:47705, 6793:47706; F24,
 * F28), which wrap under each other where they don't fit, and the wallet star at 200 × 193 at the
 * right (decorative). "Start from an example" opens the example dialog (`ExampleDialog`, its
 * state `exampleDialogReducer`); "Create the example" creates the example draft and opens it at
 * its stored step, step 1 (FR-055). The steps sit in a row
 * where the card's text column has room for them (640px), and stack below; narrower than 768px
 * the card keeps 24px padding and the picture goes (FR-010). "Create connection" opens the
 * first-connection flow at step 1 (`/get-started`). After the last connection was deleted it
 * shows with the deletion's toast, which the overview page owns; its "Undo" brings the overview
 * back with the connection (spec 010, FR-037).
 */
export default function WelcomePage({ titleRef }: WelcomePageProps) {
  const copy = useCopy(WELCOME_COPY);
  const steps = useCopy(WELCOME_STEPS);
  const { language } = useLanguage();
  const [exampleDialog, dispatchExample] = useReducer(
    exampleDialogReducer,
    INITIAL_EXAMPLE_DIALOG_STATE
  );
  const handleUnauthorized = useSignOutOnUnauthorized();
  const navigate = useNavigate();

  async function createTheExample() {
    if (exampleDialog.creating) {
      return;
    }
    dispatchExample({ type: 'start' });
    try {
      const draft = await createExample();
      dispatchExample({ type: 'done' });
      // The create flow at the draft's stored step, step 1 (FR-055)
      navigate(generatePath(ROUTES.editFormConnection, { id: draft.id }));
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatchExample({ type: 'failed', error: exampleFailureOf(error, language) });
      }
    }
  }

  return (
    <>
      <PageTitle ref={titleRef} title={copy.title} size="x-large" />
      <div className="bg-kern-layout-background-hued rounded-kern-large flex w-full items-center gap-48 p-24 md:p-48">
        <div className="@container flex min-w-0 flex-1 flex-col items-start gap-32">
          <div className="flex max-w-578 flex-col gap-8">
            <h2 className="text-kern-adaptive-large text-kern-layout-text-default font-semibold break-words">
              {copy.heading}
            </h2>
            <p className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
              {copy.text}
            </p>
          </div>
          <ol
            aria-label={copy.stepsLabel}
            className="flex w-full flex-col items-start gap-8 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:gap-16"
          >
            {steps.map((step, index) => (
              // Keyed by the glyph, the same in both languages: a switch re-keys nothing
              <WelcomeStepItem key={step.glyph} step={step} joined={index > 0} />
            ))}
          </ol>
          <div className="flex flex-wrap gap-16">
            <Link to={ROUTES.firstConnection} className="kern-btn kern-btn--primary">
              <span className="kern-label">{copy.createConnection}</span>
              <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
            </Link>
            <button
              type="button"
              onClick={() => dispatchExample({ type: 'open' })}
              className="kern-btn kern-btn--secondary"
            >
              <span className="kern-label">{copy.startFromExample}</span>
            </button>
          </div>
        </div>
        {/* Wrapped: kern.css's unlayered `img { display: block }` beats `hidden` on the image */}
        <div className="hidden flex-none md:block">
          <img src={walletStar} alt="" className="h-193 w-200" />
        </div>
      </div>
      <ExampleDialog
        state={exampleDialog}
        onCancel={() => dispatchExample({ type: 'close' })}
        onConfirm={() => void createTheExample()}
      />
    </>
  );
}
