// The guidance for agents, from one source (research R16; contracts/guidance.md): the files of
// mcp/plugin/, embedded at build time, served as the `initialize` instructions, through the
// Skills extension and through `get_guide`
import instructionsText from '../plugin/instructions.md?raw';

/** A skill: its folder's name, its frontmatter's description and its whole `SKILL.md`. */
export interface SkillDocument {
  name: string;
  description: string;
  text: string;
}

const SKILL_FILES = import.meta.glob<string>('../plugin/skills/*/SKILL.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SKILL_PATH = /\/skills\/([^/]+)\/SKILL\.md$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** The server instructions (FR-036). */
export const instructions: string = instructionsText;

function unquoted(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(['"])(.*)\1$/.exec(trimmed);
  return quoted ? quoted[2] : trimmed;
}

/** The `key: value` lines of a Markdown file's YAML frontmatter; `{}` without one. */
export function frontmatterOf(text: string): Record<string, string> {
  const block = FRONTMATTER.exec(text);
  if (!block) return {};
  const fields: Record<string, string> = {};
  for (const line of block[1].split(/\r?\n/)) {
    const field = /^([A-Za-z][\w-]*):(.*)$/.exec(line);
    if (field) fields[field[1]] = unquoted(field[2]);
  }
  return fields;
}

const SKILLS: SkillDocument[] = Object.entries(SKILL_FILES)
  .map(([path, text]) => ({
    name: SKILL_PATH.exec(path)?.[1] ?? path,
    description: frontmatterOf(text).description ?? '',
    text,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** The skills of `mcp/plugin/skills/`, by folder name. */
export function skills(): SkillDocument[] {
  return SKILLS.map((skill) => ({ ...skill }));
}

/** One skill's `SKILL.md`, or `undefined` for an unknown name. */
export function skillText(name: string): string | undefined {
  return SKILLS.find((skill) => skill.name === name)?.text;
}
