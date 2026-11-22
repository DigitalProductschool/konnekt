import { useReducer, useRef } from 'react';
import { generatePath, Link, useNavigate } from 'react-router';

import { createExample } from '../../api/form-connections';
import chainWelcomeCard from '../../assets/illustrations/chain-welcome-card@2x.webp';
import IconTile from '../../components/IconTile';
import PageTitle from '../../components/PageTitle';
import ChainTravel from '../../components/SignInMotion/ChainTravel';
import { ARRIVAL_CARD_CLASSES } from '../../components/SignInMotion/constants';
import { ROUTES } from '../../constants';
import { useCopy, useLanguage } from '../../hooks/useLanguage';
import { useSignInSurface } from '../../hooks/useSignInMotion';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import {
  INITIAL_EXAMPLE_DIALOG_STATE,
  WELCOME_COPY,
  WELCOME_STEPS,
  WELCOME_STEPS_ROW,
} from './constants';
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
function WelcomeStepItem({ step, joined, row }: WelcomeStepItemProps) {
  return (
    <li className={`flex items-center gap-16 ${joined ? row.joinedItem : ''}`}>
      {joined && (
        <span
          aria-hidden="true"
          className={`bg-kern-action-default hidden h-2 min-w-px flex-1 opacity-32 ${row.line}`}
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
 * FR-027, design-notes §3 "Empty state"; the card's picture and padding from "New visuals"
 * 7741:61982 and 7741:61974, bug new-visuals B3): "Welcome to Konnekt" as the page's h1
 * (heading/x-large, 6699:44486), then the light blue card (radius 12, padding 36 / 48, at least
 * 296 high, its content centred vertically) with a column of at most 760px: its heading "Create
 * your first connection" (title/large) and the one sentence 8px under it, the four steps 32px
 * under them, "Create connection" with its forward arrow (primary) and, 16px beside it, "Start
 * from an example" (secondary; spec 010, FR-053, 1g U18 6793:47705, 6793:47706; F24, F28), which
 * wrap under each other where they don't fit. The chain (`chain-welcome-card`, 480 × 320,
 * decorative) lies at the card's top right at its natural size, cut by the card; the card keeps
 * its visible part plus 24px (301px) free at its right, so that the column wraps before the
 * chain on a narrower card. "Start from an example" opens the example dialog (`ExampleDialog`,
 * its state `exampleDialogReducer`); "Create the example" creates the example draft and opens it
 * at its stored step, step 1 (FR-055). The steps sit in a row where the card's text column has
 * room for them (`WELCOME_STEPS_ROW`: 640px in English, the full 760px in German, so that no
 * label runs past the column into the chain; bug new-visuals B3), and stack below; narrower than
 * 768px the card keeps 24px padding and
 * the picture goes (FR-010). "Create connection" opens the
 * first-connection flow at step 1 (`/get-started`). After the last connection was deleted it
 * shows with the deletion's toast, which the overview page owns; its "Undo" brings the overview
 * back with the connection (spec 010, FR-037).
 *
 * After a successful sign-in it is the full motion's destination (bug login-welcome-motion;
 * "New visuals" 7741:61974: "In code, it is simply the card background"): the picture's clip
 * layer is the surface, which starts as the sign-in page's blue over the window and shrinks onto
 * the card while it takes the card's tint, with the travelling chain in it (`ChainTravel`); the
 * card's own picture and background wait under it. The title and the card's content fade in
 * above it. The hook measures it and starts it before the browser paints.
 */
export default function WelcomePage({ titleRef }: WelcomePageProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { card: arriving } = useSignInSurface(cardRef, surfaceRef);
  const copy = useCopy(WELCOME_COPY);
  const steps = useCopy(WELCOME_STEPS);
  const { language } = useLanguage();
  const stepsRow = WELCOME_STEPS_ROW[language];
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
      <PageTitle
        ref={titleRef}
        title={copy.title}
        size="x-large"
        className={arriving ? ARRIVAL_CARD_CLASSES.title : ''}
      />
      <div
        ref={cardRef}
        className={`${arriving ? ARRIVAL_CARD_CLASSES.card : 'bg-kern-layout-background-hued'} rounded-kern-large relative flex w-full items-center p-24 md:min-h-296 md:py-36 md:pr-301 md:pl-48`}
      >
        {/* The picture's clip layer, so that the card clips no focus ring; the sign-in motion's
            surface while that runs */}
        <div
          ref={surfaceRef}
          aria-hidden="true"
          className={
            arriving
              ? ARRIVAL_CARD_CLASSES.surface
              : 'rounded-kern-large pointer-events-none absolute inset-0 hidden overflow-hidden md:block'
          }
        >
          <img
            src={chainWelcomeCard}
            alt=""
            aria-hidden="true"
            width={480}
            height={320}
            className={`absolute top-0 right-0 h-320! w-480 max-w-none! ${arriving ? ARRIVAL_CARD_CLASSES.picture : ''}`}
          />
          {arriving && <ChainTravel />}
        </div>
        {/* Positioned, so that it paints over the clip layer */}
        <div
          className={`@container relative flex w-full max-w-760 min-w-0 flex-col items-start gap-32 ${arriving ? ARRIVAL_CARD_CLASSES.content : ''}`}
        >
          <div className="flex flex-col gap-8">
            <h2 className="text-kern-adaptive-large text-kern-layout-text-default font-semibold break-words">
              {copy.heading}
            </h2>
            <p className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
              {copy.text}
            </p>
          </div>
          <ol
            aria-label={copy.stepsLabel}
            className={`flex w-full flex-col items-start gap-8 ${stepsRow.list}`}
          >
            {steps.map((step, index) => (
              // Keyed by the glyph, the same in both languages: a switch re-keys nothing
              <WelcomeStepItem key={step.glyph} step={step} joined={index > 0} row={stepsRow} />
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
      </div>
      <ExampleDialog
        state={exampleDialog}
        onCancel={() => dispatchExample({ type: 'close' })}
        onConfirm={() => void createTheExample()}
      />
    </>
  );
}
