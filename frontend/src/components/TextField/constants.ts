/**
 * The marker after the label of an optional field, in the label's own style: the design
 * writes "Description (optional)" (U19 6699:45401; figma-audit report, cosmetic 6)
 */
export const OPTIONAL_MARKER = '(optional)';

/** The design's sign after the label of a required field (U19 6699:45396) */
export const REQUIRED_MARKER = '*';

/** KERN's input with the overlay; the placeholder in the design's muted text (U19) */
export const INPUT_CLASS = 'kern-form-input__input placeholder:text-kern-layout-text-muted';

/**
 * Figma "Form/Textarea" (U19 6699:45403): 120 px tall where kern.css gives every input 48,
 * resizable in height only. kern.css sets the height on the class, so the utility needs `!`.
 */
export const TEXTAREA_CLASS = `${INPUT_CLASS} h-120! resize-y`;

/**
 * Room for the trailing control: U10's 32 px show/hide button 4 px from the edge, with the text
 * ending 8 px before its icon's box (48 from the field's edge, U10 `6616:40784`)
 */
export const TRAILING_PADDING_CLASS = 'pr-48!';
