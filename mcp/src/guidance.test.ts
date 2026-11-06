// The guidance gate (FR-038, SC-009; contracts/guidance.md "The gate"): a tool that the skills
// don't describe, a skill without its frontmatter, or instructions that lose a level or an
// approval action fail `npm test`
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { frontmatterOf, instructions, skills, skillText } from './guidance';
import { tools } from './tools';

const SKILL_NAMES = [
  'access-levels',
  'checks-and-tests',
  'conditions',
  'connection-workflow',
  'documents-and-catalog',
  'links',
  'publishing-and-live-connections',
  'variants-and-standard',
];

const ACCESS_LEVEL_NAMES = [
  'Read only',
  'Read and edit drafts',
  'Read, edit drafts and manage live connections',
];

const APPROVAL_ACTIONS = ['publish', 'delete_draft', 'deactivate', 'reactivate', 'delete'];

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

function backticked(word: string): RegExp {
  return new RegExp('`' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`');
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => /\w/.test(word)).length;
}

describe('the skills', () => {
  it('are the eight topics of contracts/guidance.md', () => {
    expect(skills().map((skill) => skill.name)).toEqual(SKILL_NAMES);
  });

  it.each(SKILL_NAMES)('%s has frontmatter with its folder as name and a description', (name) => {
    const text = skillText(name) ?? '';
    const frontmatter = frontmatterOf(text);
    expect(frontmatter.name).toBe(name);
    expect(frontmatter.description?.trim()).not.toBe('');
    expect(skills().find((skill) => skill.name === name)?.description).toBe(
      frontmatter.description
    );
  });

  it('describe every tool of the registry, as a backticked word (FR-038)', () => {
    const texts = skills().map((skill) => skill.text);
    const undescribed = tools()
      .map((tool) => tool.name)
      .filter((name) => !texts.some((text) => backticked(name).test(text)));
    expect(undescribed, 'Tools no SKILL.md in mcp/plugin/skills/ describes').toEqual([]);
  });

  it('answer undefined for an unknown topic', () => {
    expect(skillText('no-such-topic')).toBeUndefined();
  });
});

describe('the instructions', () => {
  it.each(ACCESS_LEVEL_NAMES)('name the access level "%s"', (name) => {
    expect(instructions).toContain(`"${name}"`);
  });

  it.each(APPROVAL_ACTIONS)('name the approval action %s', (action) => {
    expect(instructions).toMatch(backticked(action));
  });

  it('have at most 500 words (the target is 400)', () => {
    expect(wordCount(instructions)).toBeLessThanOrEqual(500);
  });
});

describe('the plugin', () => {
  it('names the MCP server connection-portal in .mcp.json', () => {
    const mcp = readJson('../plugin/.mcp.json') as {
      mcpServers?: Record<string, { type?: string; url?: string }>;
    };
    expect(Object.keys(mcp.mcpServers ?? {})).toEqual(['connection-portal']);
    expect(mcp.mcpServers?.['connection-portal']).toEqual({
      type: 'http',
      url: '${CONNECTION_PORTAL_MCP_URL}',
    });
  });

  it('is named connection-portal in plugin.json', () => {
    const plugin = readJson('../plugin/.claude-plugin/plugin.json') as { name?: string };
    expect(plugin.name).toBe('connection-portal');
  });

  it('is listed in the repository root marketplace.json', () => {
    const marketplace = readJson('../../.claude-plugin/marketplace.json') as {
      plugins?: { name?: string; source?: string }[];
    };
    expect(marketplace.plugins).toContainEqual(
      expect.objectContaining({ name: 'connection-portal', source: './mcp/plugin' })
    );
  });
});
