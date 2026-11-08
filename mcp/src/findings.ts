// What `check_rules` answers per variant (contracts/mcp-tools.md "Checks and tests"; FR-032,
// FR-033; research R14): a variant's `BranchCheck` from `checkBranch()`, mapped to the tool's
// shape. Each finding names its item and the items its reason names by ref, with the rules step's
// note (`noteOf()`) and what would resolve it (`resolutionOf()`); the notice has its text
// (`noticeText()`) and resolution too; the rules the checks left out are named with why, as the
// rules step's banner and problem notes say it. Pure: it holds, stores and logs nothing (FR-035)
import type { BranchInput, RuleItem } from '@connection-portal/api-types/form-connections';
import { buildCheckedBranch } from '@connection-portal/rules/checks/checkedTree';
import {
  namesOf,
  noteOf,
  noticeText,
  resolutionOf,
} from '@connection-portal/rules/checks/findingMessages';
import type {
  BranchCheck,
  BranchNotice,
  ItemFinding,
  ItemNames,
} from '@connection-portal/rules/checks/types';
import { RULES_MESSAGES } from '@connection-portal/rules/constants';
import { flattenItems } from '@connection-portal/rules/tree';
import type { RuleContext } from '@connection-portal/rules/types';
import { ruleProblem } from '@connection-portal/rules/validation';

import {
  type ConnectionLike,
  type ItemRef,
  itemRefOf,
  type VariantRef,
  variantRefOf,
} from './views';

/** A variant's notice: no applicant can meet its rules, or every applicant does */
export interface CheckNotice {
  kind: BranchNotice['kind'];
  /** "No applicant can meet the rules of Ambulance." (`noticeText()`) */
  text: string;
  /** It holds for applicants who share today, but not on every later day (FR-008) */
  at_the_moment: boolean;
  /** What would resolve it (`resolutionOf(notice)`) */
  resolution: string;
}

/** A finding on a rule or group (contracts/mcp-tools.md, `Finding`) */
export interface Finding {
  item: ItemRef;
  kind: ItemFinding['kind'];
  /** The other items the finding's reason names, in display order */
  involves: ItemRef[];
  /** Why it holds: the rules step's note (`noteOf()`) */
  why: string;
  /** It holds for applicants who share today, but not on every later day (FR-008) */
  at_the_moment: boolean;
  /** What would resolve it (`resolutionOf()`) */
  resolution: string;
}

/**
 * Why the checks left a rule out (FR-033): no data chosen, data the connection no longer
 * requests (or an image), an incomplete condition, or a target or condition the checks can't
 * read otherwise
 */
export type NotCoveredReason =
  'no_data' | 'data_not_requested' | 'condition_incomplete' | 'unreadable';

/** A rule the checks left out, with why, in the rules step's words */
export interface NotCovered {
  item: ItemRef;
  reason: NotCoveredReason;
  /** "Rule 02 in Standard checks data that’s no longer requested." */
  text: string;
}

/** One variant's part of `check_rules`' answer (contracts/mcp-tools.md) */
export interface VariantCheck {
  variant: VariantRef;
  /** False when the check didn't finish in time or couldn't decide a question (FR-010) */
  checked_completely: boolean;
  /** The rules checked; 0 when the variant has no rule the checks can read */
  rules_checked: number;
  notice: CheckNotice | null;
  /** In display order, at most one per item; only certain findings */
  findings: Finding[];
  /** In display order */
  not_covered: NotCovered[];
}

/** A stored variant as the connection read from the backend gives it */
export type CheckedVariant = Pick<BranchInput, 'id' | 'name' | 'origin' | 'operator' | 'items'>;

/**
 * Any day: which rules the checked tree leaves out doesn't depend on the day, only the findings
 * do, and those come from the check
 */
const ANY_DAY = '2000-01-01';

/** The text of a rule left out for a reason the rules step has no message for */
function unreadableText(rule: string, variant: string): string {
  return `The checks can’t read ${rule} in ${variant}, so they leave it out.`;
}

/**
 * Every id a finding's reason names: the items it can't be met together with, a group's members,
 * the item it is the same as, and the items that cover it, an enclosing level's included
 */
function reasonIdsOf(finding: ItemFinding): string[] {
  const { reason } = finding;
  if (reason === null) {
    return [];
  }
  switch (reason.type) {
    case 'with':
    case 'members':
      return reason.items;
    case 'condition':
      return [];
    case 'same':
      return [reason.item];
    case 'implied_by':
      return [...reason.items, ...reason.orItems];
    case 'implies':
      return [...reason.items, ...reason.givenItems];
  }
}

/**
 * Why the checks left `rule` out, and the text, from the rules step's problem of the rule
 * (`ruleProblem()`, which its problem note and the refused Publish show; F11): "choose the data to
 * check" is no data, "checks data that’s no longer requested" (the banner's) is data not
 * requested, "{rule} in {variant}: <what to complete>" is an incomplete condition. Anything else,
 * such as a part the field doesn't have, is unreadable, with the problem's text when it names
 * the target, and a text of its own when the problem is only the message's, which the checks
 * don't read
 */
function notCoveredReasonOf(
  rule: RuleItem,
  variantName: string,
  context: RuleContext
): { reason: NotCoveredReason; text: string } {
  const name = rule.name.trim();
  const variant = variantName.trim();
  const problem = ruleProblem(rule, variantName, context);
  if (problem === RULES_MESSAGES.chooseData(name, variant)) {
    return { reason: 'no_data', text: problem };
  }
  if (problem === RULES_MESSAGES.notRequested(name, variant)) {
    return { reason: 'data_not_requested', text: problem };
  }
  if (problem !== null && problem.startsWith(`${name} in ${variant}: `)) {
    return { reason: 'condition_incomplete', text: problem };
  }
  const aboutMessage =
    problem === null ||
    problem === RULES_MESSAGES.noMessage(name, variant) ||
    problem === RULES_MESSAGES.messageTooLong(name, variant);
  return { reason: 'unreadable', text: aboutMessage ? unreadableText(name, variant) : problem };
}

/**
 * One variant's part of `check_rules`' answer (contracts/mcp-tools.md "Checks and tests"; FR-032,
 * FR-033): the variant, whether it was checked completely, the rules checked, the notice, the
 * findings and the rules left out with why.
 *
 * - `check` is the variant's `BranchCheck`, from `checkBranch()` of its checked tree (or the
 *   result of a check that didn't finish in time: incomplete, with the certain findings);
 * - `variant` is the variant as the connection read from the backend gives it, with its id;
 * - `context` is the rule context the checked tree was built with (`ruleContextOf()`): its
 *   `documents`, the requested ones, decide which rules are left out and why;
 * - `connection` gives the links, by its id.
 *
 * Items are named by their current names and refs (id, type, name, link); a finding whose item
 * isn't in the variant's tree, and an id of a reason that isn't, are left out, so that no answer
 * names an item that doesn't exist.
 */
export function variantCheckOf(
  check: BranchCheck,
  variant: CheckedVariant,
  context: RuleContext,
  connection: Pick<ConnectionLike, 'id'>
): VariantCheck {
  const names = namesOf(variant.items);
  const byId = new Map(flattenItems(variant.items).map((item) => [item.id, item]));
  const refOf = (id: string): ItemRef | null => {
    const item = byId.get(id);
    return item ? itemRefOf(item, variant, connection.id) : null;
  };
  const findings = check.findings.flatMap((finding) => {
    const item = refOf(finding.itemId);
    return item ? [findingOf(finding, item, names, refOf)] : [];
  });
  const { leftOut } = buildCheckedBranch(
    {
      key: check.branchKey,
      origin: variant.origin,
      operator: variant.operator,
      items: variant.items,
    },
    context,
    ANY_DAY
  );
  const notCovered = leftOut.flatMap((id) => {
    const rule = byId.get(id);
    if (rule?.type !== 'rule') {
      return [];
    }
    const item = itemRefOf(rule, variant, connection.id);
    return [{ item, ...notCoveredReasonOf(rule, variant.name, context) }];
  });
  return {
    variant: variantRefOf(variant, connection.id),
    checked_completely: check.complete,
    rules_checked: check.checkedRules,
    notice: check.notice ? noticeOf(check.notice, variant.name.trim()) : null,
    findings,
    not_covered: notCovered,
  };
}

/** A finding as `check_rules` answers it, its reason's items by ref, once each, in display order */
function findingOf(
  finding: ItemFinding,
  item: ItemRef,
  names: ItemNames,
  refOf: (id: string) => ItemRef | null
): Finding {
  const order = [...names.keys()];
  const involved = [...new Set(reasonIdsOf(finding))]
    .filter((id) => id !== finding.itemId)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return {
    item,
    kind: finding.kind,
    involves: involved.flatMap((id) => refOf(id) ?? []),
    why: noteOf(finding, names),
    at_the_moment: finding.today,
    resolution: resolutionOf(finding, names),
  };
}

function noticeOf(notice: BranchNotice, variantName: string): CheckNotice {
  return {
    kind: notice.kind,
    text: noticeText(notice, variantName),
    at_the_moment: notice.today,
    resolution: resolutionOf(notice),
  };
}
