// Prototype: a connection's details as a tagged A4 PDF with PDFKit.
// Blocks measure themselves, paginate() places them, then each page is drawn with its running
// header and footer (artifacts) and the body (tagged structure).
import { paginate } from './paginate.js';

const F = { reg: 'Reg', med: 'Med', semi: 'Semi', mono: 'Mono', monoMed: 'MonoMed' };
const C = {
  text: '#171A2B',
  muted: '#585C6E',
  faint: '#8A8D9B',
  line: '#D3D6E0',
  blue: '#0B4F9E',
  blueTint: '#EEF3FA',
  green: '#16683A',
  greenTint: '#E5F3EA',
  grey: '#5F6270',
  greyTint: '#F2F3F6',
  changed: '#6B2D8F',
  changedTint: '#F5EEF9',
  added: '#0D6B6B',
  addedTint: '#E8F5F4',
  removed: '#5F6270',
  removedTint: '#F2F3F6',
  // The app's "Draft" badge (ConnectionStatusBadge): label #05669e, dot #0284c7, info background
  draft: '#05669E',
  draftDot: '#0284C7',
  draftTint: '#E3F1FB',
  warn: '#8A4500',
  warnLine: '#D98A1C',
  warnTint: '#FFF5E6',
};
const A4 = { w: 595.28, h: 841.89 };
const M = { left: 56.69, right: 56.69 };
const W = A4.w - M.left - M.right;
const LG = (size) => size * 0.22; // line gap: about 1.4 line height with Fira Sans

const MARK = { changed: 'Changed here', added: 'Added here', removed: 'Removed here' };
const MARK_COLOUR = { changed: C.changed, added: C.added, removed: C.removed };
const MARK_TINT = { changed: C.changedTint, added: C.addedTint, removed: C.removedTint };
const ORIGIN = { main: 'Main variant', based: 'Based on Standard', empty: 'Own rules' };
const COMBINES = { and: 'All rules must be met (AND)', or: 'At least one rule must be met (OR)' };

// ---------------------------------------------------------------------------------------------
// Helpers

function heightOf(doc, text, font, size, width) {
  doc.font(font).fontSize(size);
  return doc.heightOfString(text, { width, lineGap: LG(size) });
}

function write(doc, text, font, size, colour, x, y, width, extra = {}) {
  doc.font(font).fontSize(size).fillColor(colour);
  doc.text(text, x, y, { width, lineGap: LG(size), ...extra });
}

/** Decoration that assistive technologies skip */
function artifact(doc, draw, type = 'Layout') {
  doc.markContent('Artifact', { type });
  draw();
  doc.endMarkedContent();
}

/** A structure element whose content is drawn now, inside `parent` */
function tagged(doc, parent, type, draw, options = {}) {
  parent.add(doc.struct(type, options, [draw]));
}

function badge(doc, text, colour, x, y, align = 'left') {
  doc.font(F.med).fontSize(7.5);
  const w = doc.widthOfString(text) + 10;
  const left = align === 'right' ? x - w : x;
  artifact(doc, () => {
    doc.roundedRect(left, y, w, 13, 6.5).lineWidth(0.8).strokeColor(colour).stroke();
  });
  return { left, w, draw: (parent) =>
    tagged(doc, parent, 'Span', () => write(doc, text, F.med, 7.5, colour, left + 5, y + 2.6, w)) };
}

function badgeWidth(doc, text) {
  doc.font(F.med).fontSize(7.5);
  return doc.widthOfString(text) + 10;
}

const formatDateTime = (date) =>
  new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);

const countRules = (items) =>
  items.reduce((n, item) => n + (item.type === 'rule' ? 1 : countRules(item.items)), 0);

function distinctRules(branches) {
  const ids = new Set();
  const walk = (items) => items.forEach((i) => (i.type === 'rule' ? ids.add(i.id) : walk(i.items)));
  branches.forEach((b) => walk(b.items.filter((i) => i.mark !== 'removed')));
  return ids.size;
}

// ---------------------------------------------------------------------------------------------
// Blocks. Each: { height, gapBefore, keepWithNext?, startsUnits?, unitOf?, ctx, draw(doc, y, first) }

/**
 * What a draft still needs before it can be published: the first problem of each rule, in the
 * server's words as rules/src/validation.ts's ruleProblem() gives them (not the rule checks'
 * findings, which are never stored)
 */
function problemsOf(con) {
  const problems = [];
  const walk = (items, branch) => items.forEach((item) => {
    if (item.type === 'group') return walk(item.items, branch);
    if (item.predicate == null) {
      problems.push({ id: item.id, branch, text: `${item.name} in ${branch}: choose a check.`, short: 'Choose a check.' });
    } else if (!item.message.trim()) {
      problems.push({ id: item.id, branch, text: `${item.name} in ${branch} has no error message.`, short: 'Write the message for citizens.' });
    }
  });
  con.branches.forEach((b) => walk(b.items, b.name));
  return problems;
}

function buildBlocks(doc, con, meta, tree) {
  const blocks = [];
  const add = (block) => blocks.push({ gapBefore: 0, unitOf: [], ...block });
  const draft = con.status === 'draft';
  const problems = draft ? problemsOf(con) : [];

  // --- Title block (page 1) -------------------------------------------------------------------
  const titleSect = doc.struct('Sect');
  tree.add(titleSect);
  const docs = con.documents.length;
  const items = con.documents.reduce((n, d) => n + d.fields.length, 0);
  const contents = `${docs} documents · ${items} data items · ${con.branches.length} variants · ${distinctRules(con.branches)} rules`;
  const rows = draft
    ? [
        ['Connection ID', con.id, F.mono, 9],
        ['Version', meta.version, F.monoMed, 11],
        ['Last saved', `${formatDateTime(new Date(con.updated_at))} (draft save ${con.version})`, F.reg, 9.5],
        ['Generated', `${meta.generated} (Germany)`, F.reg, 9.5],
        ['Contents', contents, F.reg, 9.5],
      ]
    : [
        ['Connection ID', con.id, F.mono, 9],
        ['Version', meta.version, F.monoMed, 11],
        ['Generated', `${meta.generated} (Germany)`, F.reg, 9.5],
        ['Contents', contents, F.reg, 9.5],
      ];
  const nameH = heightOf(doc, con.name, F.semi, 20, W);
  const descH = heightOf(doc, con.description, F.reg, 10.5, W);
  const verify = draft
    ? 'This draft is for review: it isn’t live, and its links are created only when it’s published. Its details page shows its current version: if they differ, this copy is out of date. Published unchanged, the connection keeps this version, so you can check that what goes live is what was reviewed.'
    : 'Every page of this document names the connection and this version. The connection’s details page shows its current version: if they differ, this copy is out of date.';
  const verifyH = heightOf(doc, verify, F.reg, 8.5, W - 24);
  const tableH = rows.length * 19 + 12;
  add({
    ctx: { section: null },
    height: 18 + nameH + 4 + descH + 10 + 18 + 12 + tableH + 8 + verifyH,
    draw(doc, y) {
      tagged(doc, titleSect, 'P', () => write(doc, draft ? 'CONNECTION DETAILS · DRAFT FOR REVIEW' : 'CONNECTION DETAILS', F.med, 8, draft ? C.draft : C.blue, M.left, y, W, { characterSpacing: 1 }));
      y += 18;
      tagged(doc, titleSect, 'H1', () => write(doc, con.name, F.semi, 20, C.text, M.left, y, W));
      y += nameH + 4;
      tagged(doc, titleSect, 'P', () => write(doc, con.description, F.reg, 10.5, C.muted, M.left, y, W));
      y += descH + 10;
      // Status as of generation, not part of the version
      const tone = draft
        ? { label: 'Draft', text: C.draft, dot: C.draftDot, tint: C.draftTint, note: 'Not live yet' }
        : con.is_active
          ? { label: 'Active', text: C.green, dot: C.green, tint: C.greenTint, note: `as of ${meta.generated}` }
          : { label: 'Deactivated', text: C.grey, dot: C.grey, tint: C.greyTint, note: `as of ${meta.generated}` };
      doc.font(F.semi).fontSize(9);
      const pw = doc.widthOfString(tone.label) + 26;
      artifact(doc, () => {
        doc.roundedRect(M.left, y, pw, 18, 9).fill(tone.tint);
        doc.circle(M.left + 10, y + 9, 3).fill(tone.dot);
      });
      tagged(doc, titleSect, 'P', () => write(doc, tone.label, F.semi, 9, tone.text, M.left + 18, y + 4, pw));
      tagged(doc, titleSect, 'P', () => write(doc, tone.note, F.reg, 9, C.muted, M.left + pw + 8, y + 4, W - pw - 8));
      y += 18 + 12;
      // Meta table
      artifact(doc, () => doc.roundedRect(M.left, y, W, tableH, 6).fill(draft ? C.draftTint : C.blueTint));
      const table = doc.struct('Table');
      titleSect.add(table);
      let ry = y + 8;
      rows.forEach(([key, value, font, size]) => {
        const tr = doc.struct('TR');
        table.add(tr);
        tagged(doc, tr, 'TH', () => write(doc, key, F.med, 9, C.muted, M.left + 12, ry + (size > 10 ? 2 : 1), 110), { scope: 'Row' });
        tagged(doc, tr, 'TD', () => write(doc, value, font, size, C.text, M.left + 124, ry, W - 136));
        tr.end();
        ry += 19;
      });
      table.end();
      y += tableH + 8;
      tagged(doc, titleSect, 'P', () => write(doc, verify, F.reg, 8.5, C.muted, M.left + 12, y, W - 24));
      titleSect.end();
    },
  });

  // --- Section heading ------------------------------------------------------------------------
  function section(number, title, lead) {
    const sect = doc.struct('Sect');
    tree.add(sect);
    const leadH = lead ? heightOf(doc, lead, F.reg, 10, W) : 0;
    add({
      ctx: { section: `${number}  ${title}`, head: 'section' },
      gapBefore: 24,
      keepWithNext: true,
      height: 24 + (lead ? 6 + leadH : 0) + 4,
      draw(doc, y) {
        artifact(doc, () => {
          doc.moveTo(M.left, y).lineTo(M.left + W, y).lineWidth(1.2).strokeColor(C.blue).stroke();
        });
        tagged(doc, sect, 'H2', () => {
          write(doc, `${number}  `, F.semi, 14, C.blue, M.left, y + 7, W, { continued: true });
          doc.fillColor(C.text).text(title);
        });
        if (lead) tagged(doc, sect, 'P', () => write(doc, lead, F.reg, 10, C.muted, M.left, y + 30, W));
      },
    });
    return sect;
  }

  // --- 1 Links --------------------------------------------------------------------------------
  // --- To finish before publishing (drafts with gaps) -----------------------------------------
  if (problems.length > 0) {
    const finishSect = doc.struct('Sect');
    tree.add(finishSect);
    const lead = 'These rules aren’t complete yet. The draft can be reviewed as it is, but it can only be published once they are.';
    const leadH = heightOf(doc, lead, F.reg, 9.5, W - 32);
    const itemHs = problems.map((p) => heightOf(doc, p.text, F.reg, 10, W - 48) + 4);
    const boxH = 12 + 18 + leadH + 8 + itemHs.reduce((a, b) => a + b, 0) + 10;
    add({
      ctx: { section: null }, gapBefore: 16, height: boxH,
      draw(doc, y) {
        artifact(doc, () => {
          doc.roundedRect(M.left, y, W, boxH, 6).fill(C.warnTint);
          doc.rect(M.left, y, 4, boxH).fill(C.warnLine);
        });
        tagged(doc, finishSect, 'H2', () => write(doc, `To finish before publishing (${problems.length})`, F.semi, 11.5, C.warn, M.left + 16, y + 12, W - 32));
        tagged(doc, finishSect, 'P', () => write(doc, lead, F.reg, 9.5, C.text, M.left + 16, y + 32, W - 32));
        const list = doc.struct('L');
        finishSect.add(list);
        let iy = y + 32 + leadH + 8;
        problems.forEach((p, i) => {
          artifact(doc, () => doc.circle(M.left + 22, iy + 6.5, 1.8).fill(C.warn));
          const li = doc.struct('LI');
          list.add(li);
          tagged(doc, li, 'LBody', () => write(doc, p.text, F.reg, 10, C.text, M.left + 32, iy, W - 48));
          li.end();
          iy += itemHs[i];
        });
        list.end();
        finishSect.end();
      },
    });
  }

  // --- 1 Links --------------------------------------------------------------------------------
  const linksSect = section(1, 'Links for your service', draft ? null : 'Add both links to your form. Each one goes in its own field.');
  const linkCtx = { section: '1  Links for your service' };
  function linkHeading(n, title, info, unit) {
    const infoH = heightOf(doc, info, F.reg, 9, W - 30);
    add({
      ctx: linkCtx, gapBefore: 14, keepWithNext: true, height: 18 + 4 + infoH,
      startsUnits: [unit], unitOf: [unit],
      draw(doc, y) {
        artifact(doc, () => {
          doc.circle(M.left + 9, y + 9, 9).fill(C.blue);
          doc.font(F.semi).fontSize(9).fillColor('#FFFFFF').text(String(n), M.left, y + 3.5, { width: 18, align: 'center' });
        });
        tagged(doc, linksSect, 'H3', () => write(doc, title, F.semi, 11.5, C.text, M.left + 26, y + 1.5, W - 26));
        tagged(doc, linksSect, 'P', () => write(doc, info, F.reg, 9, C.muted, M.left + 26, y + 22, W - 30));
      },
    });
  }
  function urlRow(label, url, gap, unit) {
    const urlW = W - 26 - 16;
    const urlH = heightOf(doc, url, F.mono, 8.5, urlW);
    add({
      ctx: linkCtx, gapBefore: gap, height: (label ? 16 : 0) + urlH + 12, unitOf: [unit],
      draw(doc, y) {
        const x = M.left + 26;
        if (label) {
          tagged(doc, linksSect, 'P', () => write(doc, label, F.med, 9.5, C.text, x, y, W - 26));
          y += 16;
        }
        artifact(doc, () => doc.roundedRect(x, y, W - 26, urlH + 12, 4).fill(C.greyTint));
        tagged(doc, linksSect, 'P', () => write(doc, url, F.mono, 8.5, C.text, x + 8, y + 6, urlW));
      },
    });
  }
  if (draft) {
    // A draft has no connection URL anywhere (spec 005 FR-006): say what publishing will create
    const names = con.branches.map((b) => b.name);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
    const text = `There will be one request link for all variants, and a result link for each variant: ${list}.`;
    const textH = heightOf(doc, text, F.reg, 10, W - 32);
    const boxH = 14 + 16 + 4 + textH + 14;
    add({
      ctx: linkCtx, gapBefore: 12, height: boxH,
      draw(doc, y) {
        artifact(doc, () => {
          doc.roundedRect(M.left, y, W, boxH, 6).lineWidth(1).dash(4, { space: 3 }).strokeColor(C.draftDot).stroke();
          doc.undash();
        });
        tagged(doc, linksSect, 'P', () => write(doc, 'Created when the connection is published and active.', F.semi, 10.5, C.draft, M.left + 16, y + 14, W - 32));
        tagged(doc, linksSect, 'P', () => write(doc, text, F.reg, 10, C.muted, M.left + 16, y + 34, W - 32));
      },
    });
  } else {
    linkHeading(1, 'Request link', 'Your service uses this link to create a QR code for citizens to share their data with the EUDI Wallet. There’s one link for all variants.', 'request-link');
    urlRow(null, con.trigger_url, 8, 'request-link');
    linkHeading(2, 'Result links', 'Your service gets the citizen’s shared data from this link. Each variant has its own; your service replaces {reference} with the reference the request link returned.', 'result-links');
    con.branches.forEach((b, i) => urlRow(`Variant · ${b.name}`, b.pull_url, i === 0 ? 8 : 10, 'result-links'));
  }

  // --- 2 Documents ----------------------------------------------------------------------------
  const docsSect = section(2, 'Documents and data items', 'The wallet asks the citizen for these documents and shares only these data items with your service.');
  const docCtx = { section: '2  Documents and data items' };
  con.documents.forEach((d, i) => {
    const colW = (W - 24) / 2;
    const half = Math.ceil(d.fields.length / 2);
    const cols = [d.fields.slice(0, half), d.fields.slice(half)];
    const colH = cols.map((col) => col.reduce((n, [, label]) => n + heightOf(doc, label, F.reg, 10, colW - 14) + 3, 0));
    add({
      ctx: docCtx, gapBefore: i === 0 ? 14 : 12, height: 12 + 18 + Math.max(...colH) + 10,
      draw(doc, y) {
        const boxH = 12 + 18 + Math.max(...colH) + 10;
        artifact(doc, () => doc.roundedRect(M.left, y, W, boxH, 6).lineWidth(0.8).strokeColor(C.line).stroke());
        tagged(doc, docsSect, 'H3', () => {
          write(doc, d.label, F.semi, 11.5, C.text, M.left + 12, y + 10, W - 24, { continued: true });
          doc.font(F.reg).fontSize(9).fillColor(C.muted).text(`   ${d.fields.length} data items`);
        });
        const list = doc.struct('L');
        docsSect.add(list);
        cols.forEach((col, c) => {
          let fy = y + 34;
          col.forEach(([, label]) => {
            const x = M.left + 12 + c * (colW + 12);
            artifact(doc, () => doc.circle(x + 3, fy + 6.5, 1.6).fill(C.blue));
            const li = doc.struct('LI');
            list.add(li);
            tagged(doc, li, 'LBody', () => write(doc, label, F.reg, 10, C.text, x + 12, fy, colW - 14));
            li.end();
            fy += heightOf(doc, label, F.reg, 10, colW - 14) + 3;
          });
        });
        list.end();
      },
    });
  });

  // --- 3 Rules --------------------------------------------------------------------------------
  const rulesSect = section(3, 'Rules per variant', 'A citizen’s data meets a variant when its rules are met. Each variant has its own result link. In a variant based on Standard, marks show where it differs from Standard.');
  con.branches.forEach((branch, bi) => {
    const based = branch.origin === 'based';
    const vSect = doc.struct('Sect');
    rulesSect.add(vSect);
    const unit = `variant-${bi}`;
    const ctx = { section: '3  Rules per variant', variant: branch.name };
    const descH = branch.description ? heightOf(doc, branch.description, F.reg, 9.5, W) : 0;
    const originW = badgeWidth(doc, ORIGIN[branch.origin]);
    add({
      ctx: { ...ctx, head: 'variant' }, gapBefore: bi === 0 ? 18 : 30, keepWithNext: true,
      startsUnits: [unit], unitOf: [unit],
      height: 20 + (branch.description ? 4 + descH : 0) + 6 + 14,
      draw(doc, y) {
        tagged(doc, vSect, 'H3', () => {
          write(doc, 'Variant  ', F.reg, 13, C.muted, M.left, y, W - originW - 8, { continued: true });
          doc.font(F.semi).fillColor(C.text).text(branch.name);
        });
        badge(doc, ORIGIN[branch.origin], branch.origin === 'main' ? C.blue : C.grey, M.left + W, y + 3, 'right').draw(vSect);
        let yy = y + 20;
        if (branch.description) {
          tagged(doc, vSect, 'P', () => write(doc, branch.description, F.reg, 9.5, C.muted, M.left, yy + 4, W));
          yy += 4 + descH;
        }
        tagged(doc, vSect, 'P', () => write(doc, COMBINES[branch.operator], F.med, 9, C.blue, M.left, yy + 6, W));
      },
    });
    if (branch.items.length === 0) {
      add({ ctx, gapBefore: 8, unitOf: [unit], height: 14,
        draw: (doc, y) => tagged(doc, vSect, 'P', () => write(doc, 'No rules. Anyone who shares the requested documents can apply.', F.reg, 10, C.muted, M.left, y, W)) });
    }
    addItems(branch.items, branch.operator, { parent: vSect, depth: 0, bars: [], units: [unit], based, ctx, headingLevel: 4 });

  });

  // Items of a level: rule cards and groups, with the AND/OR connector between them
  function addItems(itemsOfLevel, operator, scope) {
    itemsOfLevel.forEach((item, i) => {
      if (i > 0) connector(operator, scope, item.mark === 'removed');
      if (item.type === 'rule') ruleCard(item, scope, i === itemsOfLevel.length - 1);
      else groupBlocks(item, scope, i === itemsOfLevel.length - 1);
    });
  }

  function drawBars(doc, bars, y, height, first, gap) {
    if (bars.length === 0) return;
    artifact(doc, () => {
      const top = first ? y : y - gap;
      bars.forEach((x) => doc.rect(x, top, 2.5, y + height - top).fill(C.line));
    });
  }

  function connector(operator, scope, faded) {
    const indent = scope.depth * 18;
    add({
      ctx: scope.ctx, gapBefore: 4, keepWithNext: true, unitOf: scope.units, height: 14,
      draw(doc, y, first) {
        drawBars(doc, scope.bars, y, 14, first, 4);
        artifact(doc, () => {
          const label = operator.toUpperCase();
          doc.font(F.semi).fontSize(7.5);
          const w = doc.widthOfString(label) + 12;
          doc.roundedRect(M.left + indent + 14, y + 0.5, w, 13, 6.5).fill(faded ? C.greyTint : C.blueTint);
          doc.fillColor(faded ? C.faint : C.blue).text(label, M.left + indent + 14, y + 3.4, { width: w, align: 'center' });
        });
      },
    });
  }

  function ruleCard(rule, scope, last) {
    const indent = scope.depth * 18;
    const x = M.left + indent;
    const w = W - indent;
    const pad = 10;
    const inner = w - 2 * pad;
    const mark = scope.based ? rule.mark : null;
    const removed = mark === 'removed';
    const idW = (() => { doc.font(F.mono).fontSize(8); return doc.widthOfString(rule.id) + 10; })();
    const markW = mark ? badgeWidth(doc, MARK[mark]) + 8 : 0;
    const nameH = heightOf(doc, rule.name, F.semi, 10.5, inner - idW - markW);
    // An incomplete rule reads as far as it goes (statementPartsOf), with what's missing named
    const statement = rule.predicate == null ? `${rule.subject} …` : `${rule.subject} ${rule.predicate}`;
    const stmtH = heightOf(doc, statement, F.reg, 10, inner);
    const msg = rule.message.trim();
    const msgText = msg ? `Message for citizens: ${msg}` : '';
    const msgH = msg ? heightOf(doc, msgText, F.reg, 9, inner) : 0;
    const problem = problems.find((p) => p.id === rule.id && p.branch === scope.ctx.variant);
    const noteText = problem ? `Not complete: ${problem.short}` : '';
    const noteH = problem ? heightOf(doc, noteText, F.med, 9, inner - 14) : 0;
    const height = pad + nameH + 5 + stmtH + (msg ? 5 + msgH : 0) + (problem ? 6 + noteH : 0) + pad;
    add({
      ctx: scope.ctx, gapBefore: 4, unitOf: scope.units, height,
      // The last member of a group stays with the group's closing block
      keepWithNext: last && scope.inGroup,
      draw(doc, y, first) {
        drawBars(doc, scope.bars, y, height, first, 4);
        artifact(doc, () => {
          doc.roundedRect(x, y, w, height, 5).fill(mark ? MARK_TINT[mark] : '#FFFFFF');
          if (problem) doc.lineWidth(1.2).dash(4, { space: 3 }).roundedRect(x, y, w, height, 5).strokeColor(C.warnLine).stroke().undash();
          else doc.roundedRect(x, y, w, height, 5).lineWidth(0.8).strokeColor(mark && !removed ? MARK_COLOUR[mark] : C.line).stroke();
        });
        const div = doc.struct('Div');
        scope.parent.add(div);
        const colour = removed ? C.faint : C.text;
        tagged(doc, div, 'Span', () => write(doc, rule.id, F.mono, 8, C.muted, x + pad, y + pad + 2, idW));
        tagged(doc, div, `H${scope.headingLevel}`, () => write(doc, rule.name, F.semi, 10.5, colour, x + pad + idW, y + pad, inner - idW - markW));
        if (mark) badge(doc, MARK[mark], MARK_COLOUR[mark], x + w - pad, y + pad, 'right').draw(div);
        let yy = y + pad + nameH + 5;
        tagged(doc, div, 'P', () => write(doc, statement, F.reg, 10, colour, x + pad, yy, inner, { strike: removed }));
        yy += stmtH + 5;
        if (msg) {
          tagged(doc, div, 'P', () => {
            write(doc, 'Message for citizens: ', F.med, 9, C.muted, x + pad, yy, inner, { continued: true });
            doc.font(F.reg).fillColor(removed ? C.faint : C.muted).text(msg, { strike: removed });
          });
          yy += msgH + 5;
        }
        if (problem) {
          yy += 1;
          artifact(doc, () => {
            doc.circle(x + pad + 5, yy + 5.5, 5).fill(C.warnLine);
            doc.font(F.semi).fontSize(7.5).fillColor('#FFFFFF').text('!', x + pad, yy + 2.2, { width: 10, align: 'center' });
          });
          tagged(doc, div, 'P', () => write(doc, noteText, F.med, 9, C.warn, x + pad + 14, yy, inner - 14));
        }
        div.end();
      },
    });
  }

  function groupBlocks(groupItem, scope, last) {
    const indent = scope.depth * 18;
    const x = M.left + indent;
    const w = W - indent;
    const mark = scope.based ? groupItem.mark : null;
    const removed = mark === 'removed';
    const unit = `${scope.units[0]}-${groupItem.id}`;
    const div = doc.struct('Div');
    const markW = mark ? badgeWidth(doc, MARK[mark]) + 8 : 0;
    doc.font(F.mono).fontSize(8);
    const idW = doc.widthOfString(groupItem.id) + 10;
    const nameH = heightOf(doc, groupItem.name, F.semi, 10.5, w - 20 - idW - markW);
    const headH = 9 + nameH + 3 + 12 + 8;
    const subScope = {
      ...scope, depth: scope.depth + 1, bars: [...scope.bars, x + 6], units: [...scope.units, unit],
      parent: div, headingLevel: scope.headingLevel + 1, inGroup: true,
    };
    add({
      ctx: scope.ctx, gapBefore: 4, keepWithNext: true, startsUnits: [unit], unitOf: subScope.units, height: headH,
      draw(doc, y, first) {
        drawBars(doc, scope.bars, y, headH, first, 4);
        scope.parent.add(div);
        artifact(doc, () => {
          doc.roundedRect(x, y, w, headH, 5).fill(mark ? MARK_TINT[mark] : C.greyTint);
          doc.rect(x, y + headH - 5, w, 5).fill(mark ? MARK_TINT[mark] : C.greyTint);
        });
        tagged(doc, div, 'Span', () => write(doc, groupItem.id, F.mono, 8, C.muted, x + 10, y + 11, idW));
        tagged(doc, div, `H${scope.headingLevel}`, () => write(doc, groupItem.name, F.semi, 10.5, removed ? C.faint : C.text, x + 10 + idW, y + 9, w - 20 - idW - markW));
        if (mark) badge(doc, MARK[mark], MARK_COLOUR[mark], x + w - 10, y + 9, 'right').draw(div);
        tagged(doc, div, 'P', () => write(doc, `Group · ${COMBINES[groupItem.operator]}`, F.med, 8.5, C.blue, x + 10, y + 9 + nameH + 3, w - 20));
      },
    });
    addItems(groupItem.items, groupItem.operator, subScope);
    const msg = groupItem.message?.trim();
    const msgText = msg ? `Message for citizens: ${msg}` : '';
    const msgH = msg ? heightOf(doc, msgText, F.reg, 9, w - 20) : 0;
    const footH = msg ? 8 + msgH + 8 : 6;
    add({
      ctx: scope.ctx, gapBefore: 4, unitOf: subScope.units, height: footH,
      keepWithNext: last && scope.inGroup,
      draw(doc, y, first) {
        drawBars(doc, [...scope.bars, x + 6], y, 0, first, 4);
        drawBars(doc, scope.bars, y, footH, true, 0);
        artifact(doc, () => {
          doc.roundedRect(x, y, w, footH, 5).fill(mark ? MARK_TINT[mark] : C.greyTint);
          doc.rect(x, y, w, Math.min(5, footH)).fill(mark ? MARK_TINT[mark] : C.greyTint);
        });
        if (msg) {
          tagged(doc, div, 'P', () => {
            write(doc, 'Message for citizens: ', F.med, 9, C.muted, x + 10, y + 8, w - 20, { continued: true });
            doc.font(F.reg).text(msg);
          });
        }
        div.end();
      },
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------------------------
// Page furniture

function runningLabel(blocks, page) {
  const first = blocks[page[0].index];
  const { section, variant, head } = first.ctx;
  if (!section) return '';
  if (variant) return `${section}  ›  Variant ${variant}${head === 'variant' ? '' : ' (continued)'}`;
  return `${section}${head === 'section' ? '' : ' (continued)'}`;
}

// Two placements of what every page repeats (the user picks one from the prototype):
// - 'bottom': identity (name, connection ID, version, generated, page) in the footer, the
//   running section label in the header from page 2;
// - 'top': identity in a band at the top of every page, only the page's place (section label,
//   page n of N) at the bottom.
const LAYOUTS = { bottom: { top: 66, bottom: 74 }, top: { top: 84, bottom: 52 } };

function furnitureBottom(doc, con, meta, label, pageNo, pages) {
  const draft = con.status === 'draft';
  artifact(doc, () => {
    if (pageNo > 1) {
      write(doc, con.name, F.semi, 8.5, C.text, M.left, 34, W * 0.5, { lineBreak: false, ellipsis: true, height: 12, continued: draft });
      if (draft) doc.font(F.semi).fillColor(C.draft).text('  ·  DRAFT', { lineBreak: false });
      write(doc, label, F.reg, 8.5, C.muted, M.left + W * 0.45, 34, W * 0.55, { align: 'right', lineBreak: false, ellipsis: true, height: 12 });
      doc.moveTo(M.left, 50).lineTo(M.left + W, 50).lineWidth(0.6).strokeColor(C.line).stroke();
    }
    const y = A4.h - LAYOUTS.bottom.bottom + 22;
    doc.moveTo(M.left, y).lineTo(M.left + W, y).lineWidth(0.6).strokeColor(C.line).stroke();
    write(doc, con.name, F.med, 8, C.text, M.left, y + 8, W * 0.55, { lineBreak: false, ellipsis: true, height: 11 });
    write(doc, `Connection ID ${con.id}`, F.mono, 7, C.muted, M.left, y + 21, W * 0.6, { lineBreak: false });
    write(doc, `${draft ? 'Draft · ' : ''}Version ${meta.version}`, F.monoMed, 8, draft ? C.draft : C.text, M.left + W * 0.45, y + 8, W * 0.55, { align: 'right', lineBreak: false });
    write(doc, `${draft ? 'Not live · ' : ''}Generated ${meta.generated}  ·  Page ${pageNo} of ${pages}`, F.reg, 7.5, C.muted, M.left + W * 0.35, y + 21, W * 0.65, { align: 'right', lineBreak: false });
  }, 'Pagination');
}

function furnitureTop(doc, con, meta, label, pageNo, pages) {
  const draft = con.status === 'draft';
  artifact(doc, () => {
    // The identity band
    const y = 24;
    const h = 38;
    doc.roundedRect(M.left, y, W, h, 6).fill(draft ? C.draftTint : C.blueTint);
    doc.rect(M.left, y, 4, h).fill(draft ? C.draftDot : C.blue);
    const lx = M.left + 14;
    const rx = M.left + W * 0.45;
    const rw = W * 0.55 - 12;
    write(doc, con.name, F.semi, 9, C.text, lx, y + 7, W * 0.52, { lineBreak: false, ellipsis: true, height: 12 });
    write(doc, `Connection ID ${con.id}`, F.mono, 7, C.muted, lx, y + 22.5, W * 0.6, { lineBreak: false });
    if (draft) {
      doc.font(F.monoMed).fontSize(9);
      const vw = doc.widthOfString(`Version ${meta.version}`);
      doc.font(F.semi).fontSize(7.5);
      const dw = doc.widthOfString('DRAFT · NOT LIVE') + 12;
      const dx = M.left + W - 12 - vw - 8 - dw;
      doc.roundedRect(dx, y + 6, dw, 13, 6.5).fill(C.draftDot);
      doc.fillColor('#FFFFFF').text('DRAFT · NOT LIVE', dx, y + 8.8, { width: dw, align: 'center', lineBreak: false });
    }
    write(doc, `Version ${meta.version}`, F.monoMed, 9, draft ? C.draft : C.text, rx, y + 7, rw, { align: 'right', lineBreak: false });
    write(doc, `Generated ${meta.generated}`, F.reg, 7.5, C.muted, rx, y + 22.5, rw, { align: 'right', lineBreak: false });
    // The page's place
    const fy = A4.h - LAYOUTS.top.bottom + 18;
    doc.moveTo(M.left, fy).lineTo(M.left + W, fy).lineWidth(0.6).strokeColor(C.line).stroke();
    write(doc, label, F.reg, 8, C.muted, M.left, fy + 8, W * 0.7, { lineBreak: false, ellipsis: true, height: 11 });
    write(doc, `Page ${pageNo} of ${pages}`, F.med, 8, C.text, M.left + W * 0.6, fy + 8, W * 0.4, { align: 'right', lineBreak: false });
  }, 'Pagination');
}

/** A draft's mark on every page, over the content and faint enough to read through */
function watermark(doc) {
  artifact(doc, () => {
    doc.save();
    doc.rotate(-38, { origin: [A4.w / 2, A4.h / 2] });
    doc.font(F.semi).fontSize(150).fillColor(C.draftDot).fillOpacity(0.06);
    doc.text('DRAFT', 0, A4.h / 2 - 95, { width: A4.w, align: 'center', lineBreak: false });
    doc.restore();
  }, 'Pagination');
}

// ---------------------------------------------------------------------------------------------

export function render(PDFDocument, fonts, con, { now = new Date(), placement = 'top', version } = {}) {
  const draft = con.status === 'draft';
  const meta = { version, generated: formatDateTime(now) };
  const title = `${draft ? 'Draft – ' : ''}${con.name} – Connection details`;
  const doc = new PDFDocument({
    size: 'A4',
    // The browser build has no standard fonts: skip PDFKit's default Helvetica
    font: null,
    margins: { top: 0, bottom: 0, left: 0, right: 0 }, // we paginate ourselves
    autoFirstPage: false,
    pdfVersion: '1.7',
    subset: 'PDF/UA',
    tagged: true,
    lang: 'en-GB',
    displayTitle: true,
    info: {
      Title: title,
      Subject: `${draft ? 'Draft of connection' : 'Connection'} ${con.id}, version ${meta.version}`,
      Keywords: `connection ${con.id}; version ${meta.version}${draft ? '; draft' : ''}`,
      Author: 'Konnekt',
      Creator: 'Konnekt',
      ConnectionId: con.id,
      ConnectionVersion: meta.version,
      ConnectionStatus: draft ? 'draft' : 'published',
    },
  });
  doc.registerFont(F.reg, fonts.reg);
  doc.registerFont(F.med, fonts.med);
  doc.registerFont(F.semi, fonts.semi);
  doc.registerFont(F.mono, fonts.mono);
  doc.registerFont(F.monoMed, fonts.monoMed);
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(new Blob(chunks, { type: 'application/pdf' })));
    doc.on('error', reject);
  });

  const layout = LAYOUTS[placement];
  const furniture = placement === 'top' ? furnitureTop : furnitureBottom;
  const tree = doc.struct('Document');
  doc.addStructure(tree);
  const blocks = buildBlocks(doc, con, meta, tree);
  const pages = paginate(blocks, A4.h - layout.top - layout.bottom);

  pages.forEach((page, p) => {
    doc.addPage();
    furniture(doc, con, meta, p > 0 ? runningLabel(blocks, page) : '', p + 1, pages.length);
    page.forEach(({ index, y }, i) => blocks[index].draw(doc, layout.top + y, i === 0));
    if (draft) watermark(doc);
  });
  tree.end();
  // Spike workaround: PDFKit's PDF/UA mode writes a CIDSet (as for PDF/A-1) built from the used
  // glyphs only, missing composite glyphs' components (veraPDF 7.21.4.2). PDF/UA-1 allows no CIDSet,
  // so the fonts are finalized with the subset level hidden; the pdfuaid metadata is still written
  if (globalThis.__omitCidSet !== false) {
    for (const font of Object.values(doc._fontFamilies)) {
      const finalize = font.finalize.bind(font);
      font.finalize = () => { const level = doc.subset; doc.subset = 0; try { finalize(); } finally { doc.subset = level; } };
    }
  }
  doc.end();
  return done.then((blob) => ({ blob, pages: pages.length, version: meta.version }));
}

