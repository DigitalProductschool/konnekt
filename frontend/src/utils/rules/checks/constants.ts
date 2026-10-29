// The budgets of the rule checks (specs/003-rule-consistency-checks): the run's deadline (research
// R10), the days the evaluator can read (research R3, R6), the smallest-set searches (research R8),
// the hook's cache and how often it reads today (data-model.md, "A check run: lifecycle"). Times
// are in milliseconds

// A run's results are due 5 seconds after the change that started it (FR-010, SC-003)
export const RUN_DEADLINE_MS = 5000;

// The worker stops asking questions 4.5 seconds after the change, and posts the branch it is
// checking with its certain findings and `complete: false`. The `deadline` of its 'check' message
// is the change's time plus this
export const WORKER_STOP_MS = 4500;

// The hook terminates a worker that hasn't posted 'done' 5.5 seconds after the change. The
// branches still pending are then done, not checked completely, with no findings
export const WATCHDOG_MS = 5500;

// The first and the last day the evaluator can read (Python's `date.min` and `date.max`): the
// values of a date variable, and the days of sharing a question can ask about. As `YYYY-MM-DD`,
// and as day numbers, proleptic Gregorian ordinals as Python's `date.toordinal()` gives them
export const FIRST_DATE = '0001-01-01';
export const LAST_DATE = '9999-12-31';
export const FIRST_DAY = 1;
export const LAST_DAY = 3652059;

// The questions to the solver that a smallest-set search may ask per item, for the reason of a
// conflict (T ⊆ A(X)) and of a redundancy (S ⊆ A(X), R among the siblings). Past it, the search
// settles for a minimal set, still a true reason (research R8, step 2). 128 tries every set of up
// to six candidates with two questions each (2 × 63), and keeps a 50-item branch's searches far
// within SC-003's second
export const SEARCH_QUESTIONS_PER_ITEM = 128;

// The hook's cache: the latest result per branch key, and up to this many earlier results by
// fingerprint, such as those of the state before an undo
export const MAX_EARLIER_RESULTS = 50;

// How often the hook reads today in Germany again, besides when the page becomes visible. A new
// day reruns the checks
export const TODAY_REFRESH_MS = 60000;
