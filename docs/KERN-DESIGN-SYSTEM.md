# KERN Design System — Integration Reference

A practical reference for building a **React + TypeScript + Tailwind CSS v4** frontend with **KERN**,
the design system used by German federal/public-administration ("Bund") digital services.
Compiled from direct research (official docs, npm registry, GitLab source) plus hands-on inspection
of the installed packages (`.d.ts` files, compiled CSS, `COMPONENTS.md`) — not just secondhand docs.

This file is project-agnostic: it does not reference any specific app, Figma file, or design.
Drop it into a new project's repo root (or feed it to Claude at the start of a session) so the
integration work below doesn't need to be re-discovered from scratch.

---

## 1. What KERN is

- **KERN** ("Designsystem des Bundes") is the official design system for German public-sector
  digital services, following the "Public Money, Public Code" principle (fully open source).
- Official site / docs: **https://www.kern-ux.de/** (component docs under `/komponenten/`).
- Source lives on **GitLab (openCode.de)**, Germany's public-sector open-source platform, not GitHub:
  - `https://gitlab.opencode.de/kern-ux` — the umbrella group
  - `https://gitlab.opencode.de/kern-ux/kern-ux-plain` — source of the core native package
  - `https://gitlab.opencode.de/kern-ux/community/kern-react-kit` — source of the React kit
  - `https://gitlab.opencode.de/kern-ux/pattern-library` — an **older, deprecated** package
    (`@kern-ux/components`) — do not use, superseded by `@kern-ux/native`.
- A separate Tailwind adapter is maintained on GitHub by DigitalService Bund (the German federal
  government's own digital service agency): `https://github.com/digitalservicebund/kern-ux-tailwind-theme`
- Figma: an official KERN component library exists at `figma.com/@kern_ux` (referenced from the docs
  site), but at the time of this research it was not confirmed to be a linked/subscribed Figma
  library you can rely on via the Figma API — treat any Figma file using KERN-like token names as
  possibly using **local copies** of the tokens rather than a live library link.

## 2. The three npm packages (install all three together)

| Package | Version (at research time) | What it is | License |
|---|---|---|---|
| `@kern-ux/native` | `^2.8.2` | Core: compiled CSS (`kern.css`/`kern.min.css`), a CSS grid (`kern-grid.css`), utility classes (`kern-utilities.css`), fonts (Fira Sans, Noto Sans, Fira Mono), SCSS sources, and **every design token as CSS custom properties** (colors in OKLCH, spacing/metrics, typography, radii). Ships exactly **one** native Web Component, `<kern-kopfzeile>` (header strip). Everything else is plain BEM-style CSS classes (`.kern-button`, `.kern-input`, `.kern-accordion`, `.kern-summary-group`, …) meant to be applied to plain HTML — **framework-agnostic, no React bindings of its own.** | EUPL-1.2 |
| `@kern-ux-annex/kern-react-kit` | `^2.40.0` | **The actual React component library.** Community-maintained (not published under the main `@kern-ux` npm scope, but under a "KERN annex/community" GitLab namespace; contributors include official KERN strategic partners such as OneBitAhead GmbH). 46 components (33 core + 13 addons) as typed TSX, compiled ESM+CJS with full `.d.ts` types, plus a bundled stylesheet (an older copy of the native CSS with inlined fonts — leave it out, see "Global CSS" below). React 18 **and** 19 supported via peerDependencies. Treat it as "community, but close to official" — there is **no first-party `@kern-ux/react` package**; dead-end package names seen in older docs/search indexes: `@kern-ux/react`, `@kern-ux/components` (do not install either). | EUPL-1.2 |
| `@digitalservicebund/kern-ux-tailwind-theme` | `^4.0.0` | A single `theme.css` that uses **Tailwind v4's `@theme inline`** directive to remap every `@kern-ux/native` CSS-variable token into Tailwind's own theme namespace (see §5). CSS-only, not React-specific — works with any Tailwind v4 project, even non-React ones. Peer-depends on `@kern-ux/native@^2.8.0` and `tailwindcss@^4.1.12`. Maintained by DigitalService Bund engineers, published via GitHub Actions on a rolling basis, kept in sync with `@kern-ux/native` token renames. | MIT |

**⚠️ Fast-moving project.** This is actively developed (native had a release the week of this
research; its 2.8.x line changed the underlying color-token model). The Tailwind theme package
tracks those renames closely. **Pin exact versions** and check changelogs before upgrading — a
native/react-kit/tailwind-theme version mismatch is the most likely source of visual breakage.

### Install

```bash
npm install @kern-ux/native@^2.8.2 @kern-ux-annex/kern-react-kit@^2.40.0 @digitalservicebund/kern-ux-tailwind-theme@^4.0.0
npm install -D tailwindcss @tailwindcss/vite   # if not already present (Tailwind v4 + Vite plugin)
```

### Vite config

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

### Global CSS — import order matters

Put this in your single global CSS entry point (e.g. `src/index.css`), **in this exact order**, so
Tailwind's `@theme` machinery sees the KERN CSS variables before the theme-mapping file consumes them:

```css
@import "tailwindcss";
@import "@kern-ux/native/dist/fonts/fira-sans.css";
@import "@kern-ux/native/dist/kern.css";
@import "@digitalservicebund/kern-ux-tailwind-theme/theme.css";
```

**Don't import the React kit's stylesheet** (`@kern-ux-annex/kern-react-kit/kern-react-kit.css`)
together with `@kern-ux/native` 2.8. Verified with kit 2.40.0 and native 2.8.2:

- The kit's stylesheet bundles its own, **older copy of the native CSS**, with other token values and
  component rules. Whichever of the two loads later overrides the other's tokens. Loaded after
  `kern.css`, it gave text `#171a2b` instead of 2.8's `#131525`, labels at weight 500 instead of
  600 and 48px instead of 40px small buttons. Loaded before, its old rules still apply wherever 2.8
  sets nothing or uses a less specific selector: alerts got a 2px `border` on top of 2.8's 2px
  `outline`, and alert titles 8px instead of 5/3px padding.
- It **inlines 10 Fira Sans files** as data URIs (~1.8 MB). `fonts/fira-sans.css` above loads
  separate woff2 files instead, and browsers fetch only the weights a page uses.
- The kit's components render native KERN classes, so they work without it. The exceptions ship
  CSS-module styles only in that stylesheet: `KernMenubar`/`KernMenu`/`KernSubMenu`/`KernMenuitem`,
  the tabs, `KernInputDate`'s numeric inputs and `KernRadio`'s error state. Before using one of
  them, add its rules (they are the `._<name>_<hash>` selectors in the kit's CSS).

The kit does **not** load any CSS by itself: its `index.d.ts` contains
`import '@kern-ux/native/dist/kern.min.css'` and `import '@kern-ux/native/dist/fonts/fira-sans.css'`,
but type declarations never run, and the JS builds (`kern-react-kit.es.js`/`.cjs.js`) import no CSS.

**Size:** with the imports above, the production CSS is about **360 kB (40 kB gzip)** plus the woff2
files a page uses. Adding the kit's stylesheet makes it about 2.3 MB (1.4 MB gzip).

### Import components

Single import path for everything — core **and** addon components:

```tsx
import {
  KernButton, KernInput, KernRadioGroup, KernAccordion, KernSummaryGroup, KernSummary,
  KernAlert, KernKopfzeile, KernTaskList, KernTaskListGroup, KernHeading, KernText,
  // addons also come from the same root:
  KernSidebar, KernTabs, KernMenubar, useDialog,
} from '@kern-ux-annex/kern-react-kit'
```

(Its `index.d.ts` is simply `export * from './components/kern'; export * from './components/addons'; export * from './types'`.)

## 3. Design tokens

Authored in SCSS, compiled to **CSS custom properties**, layered:

```
primitive tokens  →  semantic/theme tokens
```

- Primitives: `--kern-color-<rampname>-<step>` (e.g. `--kern-color-darkblue-500`), OKLCH-based, steps
  from `025` to `950`. Ramps seen: darkblue, lightblue, turquoise, green, limette, yellow, orange,
  red, grey/neutral, and more.
- Semantic colors (theme-aware — these resolve differently in light vs. dark mode): e.g.
  `--kern-color-layout-text-default`, `--kern-color-layout-text-muted`, `--kern-color-layout-border`,
  `--kern-color-layout-background-default`, `--kern-color-layout-background-hued`,
  `--kern-color-action-default`, `--kern-color-action-on-default`, `--kern-color-action-visited`,
  `--kern-color-feedback-{success,info,warning,danger}(-background)`,
  `--kern-color-form-input-{background,border}`.
- Spacing: `--kern-metric-space-{none,2x-small,x-small,small,default,large,x-large}` (0/2/4/8/16/24/32px).
- Dimension (component sizing scale, larger than spacing): `--kern-metric-dimension-{2x-small,small,default,large,x-large,2x-large,3x-large,4x-large,5x-large}` plus `-media-{small,default,large}` and `-screen-size`.
- Border radius: `--kern-metric-border-radius-{none,small,default,large,circle}` (0/2/4/8/9999px).
- Border width: `--kern-metric-border-width-{light,default,bold}` (1/2/4px).
- Typography: `--kern-typography-font-family-default` (resolves to **"Fira Sans"** in the compiled
  CSS — note: some public KERN materials reference "BundesSans" as the intended production typeface;
  if your project needs pixel-perfect font fidelity, verify which one is actually meant to ship rather
  than assuming Fira Sans is final), font sizes/line-heights for `small/medium/large-static` (fixed
  across breakpoints) and `medium/large/x-large/2x-large-adaptive` (**these are genuinely
  responsive** — two fixed values switched by breakpoint, not a `clamp()`), font weights for
  title/heading/label/body (default vs. strong/subtle variants).
- Composite type styles (bundle family+weight+size+lineHeight+letterSpacing):
  `title/default`, `heading/large`, `heading/medium`, `body/default/regular`, `body/default/bold`,
  `body/large/regular`, `body/small/regular`, `label/default`, `label/default_subtle`, `label/large`,
  `label/small`.

## 4. Component API reference (verified against the installed package)

The authoritative reference is the package's own `COMPONENTS.md` and per-component `.d.ts` files
(`node_modules/@kern-ux-annex/kern-react-kit/COMPONENTS.md` and
`node_modules/@kern-ux-annex/kern-react-kit/components/kern/*.d.ts`) — always re-check these in a
fresh install, since this package moves fast. What follows is condensed from a direct read of v2.40.0.

**Core components (33):** `KernAlert`, `KernBadge`, `KernButton`, `KernCard`, `KernDialog`,
`KernDivider`, `KernHeading`, `KernIcon`, `KernKopfzeile`, `KernLink`, `KernList`, `KernLoader`,
`KernProgress`, `KernSpace`, `KernText`, `KernCheckbox`, `KernFieldset`, `KernForm`, `KernInput`,
`KernInputDate`, `KernRadio`, `KernRadioGroup`, `KernSelect`, `KernTextarea`, `KernAccordion`,
`KernColumn`, `KernContainer`, `KernRow`, `KernDescriptionList`, `KernSummary`, `KernSummaryGroup`,
`KernTable`, `KernTaskList`, `KernTaskListGroup`.

**Addon components (13):** `KernSidebar`, `KernSidebarItem`, `KernToggleDarkMode`,
`KernDialogProvider`, `useDialog`, `useDialogSafe`, `KernMenubar`, `KernSubMenu`, `KernMenu`,
`KernMenuitem`, `KernTabs`, `KernTabList`, `KernTab`, `KernTabPanels`, `KernTabPanel`, `useTabs`.

### Key props, by component

```typescript
// Button
interface KernButtonProps {
  label?: string; children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger';
  type?: 'button' | 'submit' | 'reset'; disabled?: boolean; onClick?: () => void;
  icon?: KernIconType; iconPosition?: 'left' | 'right'; alt?: string; // a11y label for icon-only buttons
  block?: boolean; href?: string; target?: string; rel?: string; className?: string;
}
// href set => renders <a>; no href => renders <button>.

// Icon
type KernIconType =
  | 'home' | 'arrow-up' | 'arrow-down' | 'arrow-forward' | 'arrow-back'
  | 'info' | 'success' | 'warning' | 'danger'
  | 'open-in-new' | 'download' | 'logout' | 'checklist' | 'mail' | 'edit'
  | 'sign-language' | 'easy-language' | 'autorenew' | 'add' | 'close' | 'delete'
  | 'search' | 'question-mark' | 'more-vert' | 'content-copy'
  | 'visibility' | 'visibility-off' | 'check' | 'drive-folder-upload'
  | 'chevron-left' | 'chevron-right'
  | 'keyboard-double-arrow-left' | 'keyboard-double-arrow-right';
interface KernIconProps { icon: KernIconType; size?: 'small' | 'medium' | 'large'; className?: string; }

// Heading / Text
interface KernHeadingProps { children: ReactNode; level: 1|2|3|4|5|6; size?: 'display'|'x-large'|'large'|'medium'|'small'; }
// default size by level: 1→display, 2→x-large, 3→large, 4→medium, 5→small, 6→small
interface KernTextProps {
  children: ReactNode; type?: 'title'|'preline'|'subline'|'label'|'body'; size?: 'large'|'small';
  bold?: boolean; muted?: boolean; // only valid with type="body"
  component?: ElementType; // override the rendered tag, default 'p'
  className?: string;
}

// Link
interface KernLinkProps {
  href?: string; label?: string; children?: ReactNode;
  target?: '_blank'|'_self'|'_parent'|'_top'; onClick?: () => void;
  icon?: KernIconType; small?: boolean; className?: string;
}

// Forms
interface KernInputProps {
  id: string; label: string; type?: 'text'|'email'|'password'|'number'|'tel'|'url'|'search';
  value?: string|number; defaultValue?: string|number; name?: string;
  required?: boolean; disabled?: boolean; readonly?: boolean; hint?: string; error?: string;
  autoFocus?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
interface KernTextareaProps { id:string; label:string; name?:string; value?:string; defaultValue?:string; required?:boolean; disabled?:boolean; readonly?:boolean; rows?:number; cols?:number; hint?:string; error?:string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; }
interface KernSelectProps { id:string; label:string; name?:string; required?:boolean; disabled?:boolean; hint?:string; error?:string; children: ReactNode; } // <option> children, plain HTML
interface KernCheckboxProps { id:string; label:string; name?:string; checked?:boolean; defaultChecked?:boolean; required?:boolean; disabled?:boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; }
interface KernRadioGroupItem { id?:string; value?:string; label:string; disabled?:boolean; }
interface KernRadioGroupProps {
  name:string; legend?:string; selected?:string; items: KernRadioGroupItem[];
  errorMessage?:string; hint?:string; optional?:boolean; horizontal?:boolean;
  onChange?: (newValue:string, event:FormEvent) => void; autoFocus?:boolean; className?:string;
}
interface KernInputDateProps { id:string; label:string; value?:string; onChange?:(value:string)=>void; required?:boolean; disabled?:boolean; className?:string; }
// ⚠️ GOTCHA verified against the compiled component: KernInputDate does NOT behave like a normal
// controlled input. It renders three separate day/month/year sub-inputs plus an internal hidden
// combined input, and in practice its onChange prop is unreliable for reading a live combined value.
// Workaround that works: read the three segment inputs on blur, e.g.
//   fieldsetEl.querySelector('input[id$="-day"]') / '[id$="-month"]' / '[id$="-year"]'
// and compose them into an ISO yyyy-mm-dd string yourself (wire an onBlur on a wrapping <fieldset>,
// since blur on the segment inputs bubbles up to it). Use `defaultValue`, not `value`, to seed it.
interface KernFieldsetProps { label?:string; hint?:string; error?:string; orientation?:'vertical'|'horizontal'; children: ReactNode; className?:string; }
interface KernFormMethods { checkValidity():boolean; reportValidity():boolean; getValues():Record<string,FormDataEntryValue>; }
interface KernFormProps { children:ReactNode; onSubmit?:(e:FormEvent<HTMLFormElement>)=>void; className?:string; } // ref gives KernFormMethods

// Layout
interface KernContainerProps { children:ReactNode; fluid?:boolean; className?:string; }
interface KernRowProps { children:ReactNode; align?:'start'|'center'|'end'; justify?:'start'|'center'|'end'|'around'|'between'|'evenly'; className?:string; }
interface KernColumnProps { children:ReactNode; align?:...; justify?:...; sizes?: {xs?:number;sm?:number;md?:number;lg?:number;xl?:number;xxl?:number}|number; offsets?: same shape; className?:string; }
interface KernSpaceProps { size?: '2x-small'|'x-small'|'small'|'default'|'large'|'x-large'; debug?:boolean; className?:string; children?:ReactNode; } // a literal spacer element
interface KernDividerProps { spacing?: 'none'|'2x-small'|'x-small'|'small'|'default'|'large'|'x-large'; className?:string; } // horizontal only — no vertical-orientation option

// Accordion
interface KernAccordionItem { id?:string; title:string; body:ReactNode; defaultOpen?:boolean; className?:string; }
interface KernAccordionProps { items: KernAccordionItem[]; variant?: 'single'|'group'; className?:string; } // default 'group'

// Data / review-summary patterns
interface KernTableColumn { id?:string; label:string; numeric?:boolean; valueGetter?:(v:any)=>string|number|boolean; valueFormatter?:(v:any)=>ReactNode; }
interface KernTableProps { title?:string; columns:(string|KernTableColumn)[]; rows:Array<Record<string,any>>; footer?:ReactNode[]; striped?:boolean; small?:boolean; responsive?:boolean; className?:string; }
interface KernTaskListItem { number?:number; label:string; badge?: KernBadgeProps; onClick?:()=>void; }
interface KernTaskListProps { title?:string; items: KernTaskListItem[]; className?:string; } // a GOV.UK-style "task list" pattern
interface KernTaskListGroupProps { title?:string; children:ReactNode; className?:string; } // groups multiple KernTaskList
interface KernDescriptionListProps { details: Record<string, ReactNode|Date|File|object>; columns?:boolean; formatKey?:(k:string)=>string; formatValue?:(k:string,v:any)=>ReactNode; ignoredDetailKeys?:string[]; className?:string; }
interface KernSummaryProps {
  number?:number; label?:string; showHeader?:boolean; // default true
  actions?: KernLinkProps[]; // e.g. [{href:'#edit', label:'Edit', icon:'edit'}] — the GOV.UK "check your answers" pattern
  descriptionList?: KernDescriptionListProps; // full control
  details?: Record<string,any>; // simplified alternative to descriptionList
  formatKey?: (k:string)=>string; children?: ReactNode; className?:string;
}
// ⚠️ GOTCHA: KernSummary's `actions` links render BELOW the description list body, not beside the
// header/title. There is no prop to put an action in the header row. If your design puts an
// edit/change link next to the section title, you'll have a visual mismatch to accept or work around.
interface KernSummaryGroupProps { title:string; children:ReactNode; className?:string; } // groups multiple KernSummary

// Alert / Badge
interface KernAlertProps { title:string; variant:'info'|'success'|'warning'|'danger'; children?:ReactNode; linkText?:string; linkHref?:string; linkIcon?:KernIconType; className?:string; }
interface KernBadgeProps { label:string; variant:'info'|'success'|'warning'|'danger'; withIcon?:boolean; className?:string; }

// Card
interface KernCardProps { title:string; preline?:string; subline?:string; img?:string; altText?:string; children:ReactNode; footer?:ReactNode; interactive?:boolean; size?:'small'|'large'; className?:string; }

// List
interface KernListItem { content:ReactNode; className?:string; id?:string; }
interface KernListProps { items: KernListItem[]; type?:'simple'|'bullet'|'number'; size?:'small'|'medium'|'large'; start?:number; className?:string; }

// Header (the one native Web Component, wrapped for React)
interface KernKopfzeileProps { icon?:ReactNode; label:string; fluid?:boolean; className?:string; }
// ⚠️ GOTCHA: KernKopfzeile is NOT a full site-header/nav bar. Per its own compiled CSS it's a small,
// single-line gray identification strip: background #F3F4F7 (--kern-color-layout-layer-surface-contextual),
// 16px Fira Sans label text, ~5px vertical padding. It's meant for a thin "you are on an official
// government service" identifier line, not a bordered title bar with navigation/actions. It has no
// slot for trailing actions/buttons — if your design needs a title bar with e.g. a trailing "Help"
// link, compose KernKopfzeile (for an identification strip) alongside your own flex row using
// KernText/KernButton for the rest, rather than trying to make KernKopfzeile do both jobs.

// Progress (this IS the de-facto "stepper"/wizard progress indicator — there is no component literally named Stepper/Wizard)
interface KernProgressProps { labelPosition?:'top'|'bottom'; label?:string; value:number; max:number; className?:string; }
// Typical usage for a multi-step form: <KernProgress value={currentStep} max={totalSteps} label={`Step ${currentStep} of ${totalSteps} · ${stepName}`} />

// Dialog (modal)
interface KernLegacyDialogButton { id:string; name:string; primary?:boolean; callback?:()=>Promise<boolean|void>|boolean|void; }
interface DialogContextValue { open:boolean; handleOpen:()=>void; handleClose:()=>void; title:string; setTitle:(t:string)=>void; body:ReactNode; setBody:(b:ReactNode)=>void; buttons:KernButtonProps[]; setButtons:(b:KernButtonProps[])=>void; openModal:(title:string, body:ReactNode, buttons:KernLegacyDialogButton[])=>void; }
// Usage: wrap app/subtree in <KernDialogProvider>, call useDialog() for { openModal } (or useDialogSafe() which throws outside the provider instead of returning null).

// Tabs
interface KernTabsProps { id:string; onTabChange?:(index:number)=>void; children:ReactNode; } // wraps KernTabList>KernTab + KernTabPanels>KernTabPanel

// Menu / Menubar (full keyboard nav)
interface KernMenubarProps { ariaLabel:string; children:ReactNode; className?:string; }
interface KernMenuProps { ariaLabel:string; focusIndex:number; children:ReactNode; className?:string; } // dropdown-style menu
interface KernSubMenuProps { label:string; children:ReactNode; className?:string; }
interface KernMenuitemProps { children: ReactElement; } // must be a single <a> or <button>

// Sidebar
interface KernSidebarItemProps { children:ReactNode; className?:string; } // KernSidebar expects KernSidebarItem children
```

## 5. Tailwind v4 integration — exact utility classes available

After importing `@digitalservicebund/kern-ux-tailwind-theme/theme.css` as shown in §2, these
Tailwind utility families become usable directly in `className`:

- **Colors** (`--color-kern-*` namespace):
  - Full ramps: `bg-kern-{darkblue,lightblue,turquoise,green,limette,yellow,...}-{025..950}`
  - Semantic (prefer these over raw ramp steps for anything content/UI related):
    `bg-/text-/border-kern-layout-background-default`, `-background-hued`, `-background-overlay`,
    `-background-inverted`, `-text-default`, `-text-inverse`, `-text-muted`, `-border`
    `kern-action-default`, `-action-on-default`, `-action-visited`, `-action-focus-default`,
    `-action-state-indicator-default` (and `-shade`/`-shade-hover`/`-shade-active`/`-tint` variants)
    `kern-feedback-{danger,info,success,warning}` and `-{danger,info,success,warning}-background`
    `kern-form-input-background`, `kern-form-input-border`
    `kern-white`, `kern-black`
- **Fonts** (`--font-kern-*`): `font-kern-default`, `font-kern-sans` (Fira Sans), `font-kern-mono`
  (Fira Mono) — no serif is defined.
- **Spacing** (`--spacing-kern-*`, usable as `p-`/`m-`/`gap-`/`w-`/`h-`/etc. with the `kern-` prefix
  preserved after the dash):
  - `space-{none,2x-small,x-small,small,default,large,x-large}` → 0/2/4/8/16/24/32px (e.g. `p-kern-space-default`, `gap-kern-space-large`)
  - `dimension-{2x-small,x-small,small,default,large,x-large,2x-large,3x-large,4x-large,5x-large}` and `dimension-media-{small,default,large}` → a larger component-sizing scale (e.g. `size-kern-dimension-default`)
  - `screen-size`
- **Font size + line-height pairs** (`--text-kern-*`; Tailwind v4 auto-pairs a `--text-kern-X` with a
  matching `--text-kern-X--line-height` when both exist, so one class gives you both):
  - Raw sizes: `text-kern-{12,16,18,20,21,24,26,32,40,48,56,72,80}`
  - Static (same at every breakpoint): `text-kern-static-{small,medium,large}`
  - Adaptive (genuinely responsive — resolves to a smaller value on narrow/mobile breakpoints):
    `text-kern-adaptive-{medium,large,x-large,2x-large}`
- **Radius** (`--radius-kern-*`): `rounded-kern-{none,small,default,large,circle}`
- **Breakpoints** (`--breakpoint-kern-*`, matching KERN's own responsive system): `sm`/`md`/`lg`/`xl`/`xxl` → 576/768/992/1200/1600px. Use as Tailwind variants, e.g. `kern-md:flex-row` style (confirm exact variant syntax against the installed theme.css/Tailwind v4 docs — v4 generates these as real breakpoint variants from the `--breakpoint-*` namespace).
- Shadows, tracking, and leading are **explicitly left undefined** by this theme — KERN defines none
  of its own, so don't expect `shadow-kern-*` etc. to exist.

**Rule of thumb:** use KERN component props for anything the component already styles (typography,
button/badge/alert colors, etc. — prefer `KernHeading`/`KernText` over a raw `<h1>`/`<p>` with manual
Tailwind text classes, since the components already apply the correct type scale). Reach for the
Tailwind `kern-*` utilities above only for the custom layout/composition glue the design-system
components themselves don't cover (page containers, custom cards/panels, spacing between components,
one-off colored strips, etc.) — never hardcode raw hex colors or raw px values when a token exists.

## 6. Confirmed gaps — things KERN does *not* provide a component for

Verified by reading the native package's compiled CSS class list (`kern.css`) and the React kit's
full component inventory (`COMPONENTS.md`) — these are real gaps, not an oversight on the integrator's part:

1. **Breadcrumb.** No `.kern-breadcrumb*` CSS class exists in the native package; no `KernBreadcrumb`
   in the React kit; not mentioned on the `/komponenten` docs index. Build it yourself from `KernLink`
   + `KernIcon` (e.g. `chevron-right` as a separator) + plain nav/ol markup.
2. **File upload / dropzone.** The native design system *documents* a file-upload pattern (with
   drag-and-drop states) at `kern-ux.de/komponenten/form-inputs/file/`, but there is **no
   corresponding CSS class block** in the compiled `kern.css` and **no `KernFileUpload`/similar** in
   the React kit's 46 components. The only directly relevant asset is the `drive-folder-upload`
   `KernIcon`. Build a custom dropzone component using that icon plus `KernBadge` (status) and
   `KernButton` (upload/remove actions) rather than inventing new visual language.
3. **Stepper / wizard progress indicator.** There is no component literally named `Stepper` or
   `Wizard`. The closest official matches are `KernProgress` (a determinate progress bar with a
   `label`/`value`/`max` — the natural fit for "Step X of Y") and `KernTaskList`/`KernTaskListGroup`
   (a GOV.UK-style task-list-with-status pattern, useful for a dashboard-style "what's done" overview
   rather than an inline step indicator). For a typical multi-step form, `KernProgress` alone is
   usually sufficient — compose, don't invent a new visual.

When something is a true gap like the above, build the smallest custom component that reuses KERN's
existing tokens/icons/typography components for its internals (colors, spacing, font, icons) — never
write raw hex/px values or a separate ad-hoc CSS file for it.

## 7. Practical gotchas discovered during integration

- **`KernInputDate` is not a normal controlled component** — see the dedicated note in §4's forms
  section. Plan for reading its three segment inputs on blur rather than a simple `value`/`onChange`.
- **`KernKopfzeile` is a thin identification strip, not a full header bar** — see §4's note. Don't
  expect it to carry navigation, actions, or a bordered title-bar look; compose around it.
- **`KernSummary`'s `actions` render below the content, not beside the header** — see §4's note. If a
  design wants an inline "Edit" link next to a section title, there is currently no prop for that.
- **`KernDivider` is horizontal-only** — there's no vertical-orientation prop; for a vertical divider
  use a plain `w-px` (or similar) utility element instead.
- Font family in the compiled CSS resolves to **"Fira Sans"**, not "BundesSans" (which some KERN
  marketing/docs materials reference) — if pixel-perfect typeface fidelity matters for your project,
  confirm which is actually intended before assuming Fira Sans is final/production-correct.
- The React kit's stylesheet bundles an older native KERN and inlines its fonts; see §2 for why it is
  left out and what that costs.
- **KERN's CSS is not in a cascade layer, Tailwind's utilities are.** An unlayered rule beats a layered
  one whatever its specificity, so `className="pr-56"` on a KERN input loses to KERN's own padding.
  Wrap the KERN element and style the wrapper, or use Tailwind's `!` suffix (`pr-56!`) sparingly.
- **`kern.css` follows the browser's dark mode** unless the page pins a theme. Its
  `@media (prefers-color-scheme: dark)` rule switches the semantic colour tokens
  (`--kern-color-layout-*`, `-action-*`, `-feedback-*`, `-form-input-*`, …), and with them the
  Tailwind theme's semantic utilities. Primitives (`--kern-color-neutral-025`, …), colours fixed
  in SVG files and shadows stay light, so a light-only design that mixes them renders half dark.
  To pin light, put `data-kern-theme="light"` (or the `kern-light` class) on `<html>`: it has the
  same specificity as the `:root` rule and comes later in `kern.css`, so it wins and sets the
  light values again. `KernToggleDarkMode` sets the same attribute. `kern.css` declares no
  `color-scheme`, so also set `color-scheme: only light` for the browser's own controls; `only`
  also opts the page out of Chromium's auto dark theme. The switch was renamed once
  (`data-theme` → `data-kern-theme`, 2.1.0): recheck it after upgrades.
- **Adaptive type changes at 768px.** From that width `kern.css` raises the `*-adaptive` font sizes and
  line heights (e.g. 2x-large 48/56 → 72/80, medium 21/24 → 24/32) and the heading and title baseline
  paddings that go with them (title 5/3 → 8/8). A Figma file built with KERN's variables can show the
  small-screen values on desktop frames. If the design is meant that way, pin those tokens in `:root`
  after the imports.
- **`--kern-metric-border-radius-circle` is `50%`**, which turns a non-square element into an ellipse.
  For pills, use a fixed radius.
- **`KernButton` always renders a padded `.kern-label`**, so an icon-only `KernButton` is wider than
  KERN's icon-only size. For the exact size (40px with `kern-btn--small`), write the native markup:
  `<button class="kern-btn kern-btn--tertiary kern-btn--small">` with the icon span and
  `<span class="kern-label kern-sr-only">Text</span>`.
- **KERN draws the focus ring of buttons on `:focus`, not `:focus-visible`.** Browsers that focus a
  button on click (Chromium, Firefox on Windows and Linux, Android) then show the 4px ring from the
  moment the mouse goes down until focus moves on, which looks like a border on the button. To keep
  it for keyboard focus only, add this after the imports (KERN's selector has specificity 0,4,0,
  hence `!important`): `.kern-btn:focus:not(:focus-visible) { outline: none !important; }`.
  Keyboard focus and forced colors (`outline: auto` on `:focus-visible`) keep KERN's ring, and
  links already use `:focus-visible`. Checkboxes and radios draw their ring on `:focus` as well.
- **The reverse also holds: `.kern-btn:has(.kern-sr-only)` is 48px wide.** Any `.kern-sr-only`
  inside a KERN button makes it icon-sized, so text that only screen readers should hear in a
  labelled button ("View <name>") uses another visually-hidden class, such as Tailwind's `sr-only`.
- **Checkboxes**: `.kern-form-check .kern-label` has a 4px top padding, while the KERN Figma
  checkbox uses the label baseline padding of 6px/2px; there is no indeterminate style (this
  project draws a dash in `index.css`), and the focus ring shows on any `:focus` (turned off for
  pointer focus like the buttons').
- **Dialogs**: `<dialog class="kern-dialog">` opened with `showModal()` sits in the top left
  corner under Tailwind, whose preflight sets `margin: 0` on every element and so cancels the
  browser's `margin: auto` for modal dialogs; add `m-auto`. The KERN Figma dialog draws its border
  and the footer's top border inside its frame and puts the title in a container with an 8px top
  padding, so kern.css's dialog is 3px taller and its title 8px higher than the Figma one.
  `.kern-dialog__footer .kern-btn` only sets `flex-grow`, so two buttons of different borders
  end up 2px apart in width; give them explicit widths. Below 576px kern.css turns the dialog into
  a bottom sheet.
- **Tertiary buttons tint their background on hover (8%) and press (16%).** To show only the icon
  of an icon-only tertiary button, override both with `[&:is(:hover,:active)]:bg-transparent!`.
  Not `hover:`: Tailwind 4 wraps it in `@media (hover: hover)`, while KERN's rule also matches the
  `:hover` that sticks after a tap on touch screens.
- **`KernLink` and `KernButton` with `href` render a plain `<a href>`**, which reloads a single-page
  app. For links between the app's routes, give the router's link component KERN's classes:
  `kern-link` (plus `kern-link--small` for 16px text), or `kern-btn kern-btn--primary` (plus
  `kern-btn--block` for full width) with the text in `<span class="kern-label">`, as `KernButton`
  writes it. `a.kern-btn` has no underline.
- **Visited links turn purple**: `.kern-link:visited` uses `--kern-color-action-visited` (#75009E),
  also for links between the app's own routes.
- **`kern.css` sets `scrollbar-gutter: stable` on `html`.** With classic (non-overlay) scrollbars the
  page is narrower than the window by the scrollbar's width (15px in Chromium on Linux), even when
  nothing scrolls. To compare a page with a design frame, make the window that much wider than the
  frame.
- **The kit's built-in texts are German** (`loading: "Wird geladen..."`, `closeDialog: "Schließen"`, …).
  For another UI language, wrap the app in `KernContextProvider` with `translations` for all seven keys.
- `KernInput` adds "- Optional" to the label unless `required` is set, and its hint and error elements
  have fixed ids, so two inputs with hints on one page share an id.
- All three packages move fast and are versioned independently — **always re-verify exact prop names
  against the currently-installed `node_modules/@kern-ux-annex/kern-react-kit/COMPONENTS.md` and
  `components/kern/*.d.ts`** rather than trusting any cached knowledge (including this document) to
  stay accurate indefinitely.

## 8. Sources

- https://www.kern-ux.de/ (official docs; component pages under `/komponenten/`, e.g. `/komponenten/button`, `/komponenten/progress`, `/komponenten/summary`, `/komponenten/form-inputs/file/`, `/komponenten/form-inputs/radios`, `/komponenten/icon`, `/komponenten/tasklist`)
- https://www.npmjs.com/package/@kern-ux/native · https://registry.npmjs.org/@kern-ux/native
- https://www.npmjs.com/package/@kern-ux-annex/kern-react-kit · https://registry.npmjs.org/@kern-ux-annex/kern-react-kit
- https://registry.npmjs.org/@digitalservicebund/kern-ux-tailwind-theme
- https://gitlab.opencode.de/kern-ux/kern-ux-plain
- https://gitlab.opencode.de/kern-ux/community/kern-react-kit
- https://gitlab.opencode.de/kern-ux/pattern-library (deprecated, for reference only)
- https://kern-react-kit-75d4e7.usercontent.opencode.de/ (live Storybook for the React kit)
- https://github.com/digitalservicebund/kern-ux-tailwind-theme
- https://digitalservice.bund.de/en/blog/designing-effective-and-efficient-digital-services-with-patterns-and-systems
- https://www.dataport.de/newsroom/stories/ux-standard-in-der-oeffentlichen-verwaltung-ein-staat-ein-design/
