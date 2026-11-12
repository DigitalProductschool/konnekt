import { defineTexts } from '@connection-portal/rules/language';

/**
 * "Active from" (C2): the frames' English (U75 6376:25536, 6383:66119; U76 6635:36265), the
 * field's name for screen readers from contracts/copy.md §2, the error the spec's (FR-003) in
 * the server's German (`INVALID_START_DATE_DETAIL`); German terms from spec 009's glossary
 * ("Aktiv ab", "Sofort" / "Ab einem Datum", "Startdatum"). The placeholder takes the German
 * letters of the field's name (TT.MM.JJJJ); the dates themselves read DD.MM.YYYY in both
 */
export const ACTIVE_FROM_COPY = defineTexts(
  {
    legend: 'Active from',
    now: 'Now',
    onDate: 'On a date',
    placeholder: 'DD.MM.YYYY',
    fieldLabel: 'Start date (DD.MM.YYYY)',
    dateError: 'Enter a date after today.',
  },
  {
    legend: 'Aktiv ab',
    now: 'Sofort',
    onDate: 'Ab einem Datum',
    placeholder: 'TT.MM.JJJJ',
    fieldLabel: 'Startdatum (TT.MM.JJJJ)',
    dateError: 'Geben Sie ein Datum nach dem heutigen Tag ein.',
  }
);

/** A day as typed: `DD.MM.YYYY`, also with a one-digit day or month (`D.M.YYYY`; FR-003) */
export const START_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

/**
 * The "Go live" row of "Dialog content/Publish · summary" (6374:25447; U75 6380:26663): 16 in
 * from the dialog's content, the label 112 wide, 24 to the choice, which has the radios and,
 * under them 8 apart, the date field and its error. Below 640 px the choice goes under the label,
 * 4 apart, as the summary's rows put their lines (`PublishSummaryRow`; W16). Below 320 CSS px
 * (`narrow:`) the group drops its indent, so that the field keeps room for its placeholder
 */
export const ACTIVE_FROM_CLASSES = {
  group:
    'm-0 flex w-full min-w-0 items-start gap-24 border-0 p-0 pl-16 max-sm:flex-col max-sm:gap-4 narrow:pl-0!',
  // label/default in the action blue, centred on the 32 px radio row. The legend floats so that
  // it is a flex item of the fieldset
  legend:
    'text-kern-static-medium text-kern-action-default float-left flex min-h-32 w-112 shrink-0 items-center p-0 max-sm:min-h-0 max-sm:w-auto leading-(--kern-typography-line-height-medium-static) font-semibold',
  choice: 'flex min-w-0 flex-1 flex-col items-start gap-8 max-sm:w-full',
  radios: 'flex flex-wrap items-center gap-x-24',
  /** body/small, muted: the caller's hint (not drawn; W1, copy.md §2) */
  hint: 'text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)',
};

/**
 * "Data/Radio item" (6387:26931, a KERN extension matching "Data/Check item"; as the rules step's
 * "Start with"): a 20 px radio, white with a 1 px `layout-border` ring, selected the 1 px
 * action-blue ring with a 10 px action-blue dot; 8 px to its body/small 14/24 label; 4 px above
 * and below. States (the component's description): hover unselected a 2 px action-blue ring on
 * the tint, hover selected a 3 px tint ring, keyboard focus a 3 px ring in the focus colour,
 * never after a click (index.css), disabled at KERN's disabled opacity. KERN's radio is 32 px
 * with a 12 px ink dot and swaps its border for the ring on any focus (kern.css, unlayered),
 * hence the `!`
 */
export const ACTIVE_FROM_RADIO_CLASSES = {
  // kern.css pads the row 16 at the right, which would widen the 24 between the radios
  row: 'kern-form-check flex! items-center! gap-8 py-4 pr-0!',
  radio:
    'kern-form-check__radio size-20! shrink-0 cursor-pointer border! border-kern-layout-border! bg-kern-layout-background-default! checked:border-kern-action-default! checked:before:size-10! checked:before:bg-kern-action-default! hover:not-checked:border-2! hover:not-checked:border-kern-action-default! hover:not-checked:bg-kern-action-state-indicator-tint! hover:checked:shadow-[0_0_0_3px_var(--kern-color-action-state-indicator-tint)] focus-visible:outline-3! focus-visible:outline-solid! focus-visible:outline-kern-action-focus-default! focus-visible:outline-offset-0! disabled:cursor-default disabled:opacity-(--kern-color-action-state-opacity-disabled)',
  label:
    'kern-label text-kern-static-small! text-kern-layout-text-default cursor-pointer p-0! leading-(--kern-typography-line-height-medium-static) font-normal!',
};

/**
 * The date field ("Rules/Number field" 6194:42241 in U75 6380:26675): 128 × 40, white, a 1 px
 * line, radius 8, 16 at the sides, body/default with the placeholder muted; with the error the
 * line is `feedback-danger` (U76). The frame's line is `decorative-border` (#e1e6f0, 1.25:1 on
 * white), short of AA's 3:1 for a field's boundary (SC-009, T106): the build draws it in
 * `layout-border` (#6b7488, 4.7:1), the overlay's nearest token that passes, which the radios
 * beside it and the checkboxes already use (design-notes §1). Keyboard focus: KERN's 4 px ring, 2 off.
 * Below 320 CSS px (`narrow:`) it may narrow to its column, with 4 at the sides and body/small,
 * so that "DD.MM.YYYY" (87 px at 16) still shows whole in 89 px
 */
export const DATE_FIELD_CLASSES = {
  base: 'rounded-kern-default bg-kern-layout-background-default text-kern-static-medium text-kern-layout-text-default placeholder:text-kern-layout-text-muted focus-visible:outline-kern-action-focus-default h-40 w-128 max-w-full min-w-0 border px-16 leading-(--kern-typography-line-height-medium-static) focus-visible:outline-4 focus-visible:outline-offset-2 narrow:text-kern-static-small narrow:px-4! disabled:opacity-(--kern-color-action-state-opacity-disabled)',
  valid: 'border-kern-layout-border',
  invalid: 'border-kern-feedback-danger',
};

/**
 * "Rules/Field error" (6194:42227, U76): KERN's danger icon, small (20 px), and body/small in the
 * danger colour, 4 px apart, under the field
 */
export const DATE_ERROR_CLASSES = {
  message:
    'text-kern-static-small text-kern-feedback-danger flex items-center gap-4 leading-(--kern-typography-line-height-medium-static)',
  icon: 'kern-icon kern-icon--danger kern-icon--small bg-kern-feedback-danger! shrink-0',
};
