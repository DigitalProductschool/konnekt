// The guide (contracts/mcp-tools.md "Guidance and access"; FR-037): the skills of mcp/plugin/skills/
// as a tool, for clients without the Skills extension. The same texts the extension serves, from
// the same source (guidance.ts)
import { z } from 'zod';

import { skills, skillText } from '../guidance';
import { summaryTextOf } from '../views';
import { registerTool, toolError, toolResult } from './registry';

export const GUIDE_MESSAGES = {
  unknownTopic: (topic: string, known: string[]) =>
    `The guide has no topic '${topic}'. Its topics: ${known.join(', ')}.`,
} as const;

registerTool({
  name: 'get_guide',
  level: 'read',
  description:
    'Reads the guidance on working in Konnekt by topic, the same text as the ' +
    "server's skills: without topic, the topics with what each covers; with one, its full text. " +
    'Read the topic before working on its subject.',
  input: z.object({
    topic: z
      .string()
      .optional()
      .describe('A topic as the list names it, such as conditions; the list of topics without'),
  }),
  handler: async (_caller, input) => {
    const topic = input.topic?.trim();
    const topics = skills().map(({ name, description }) => ({ name, description }));
    if (!topic) {
      return toolResult(
        { topics },
        summaryTextOf(
          'Topics of the guide:',
          ...topics.map((each) => `- ${each.name}: ${each.description}`)
        )
      );
    }
    const text = skillText(topic);
    if (text === undefined) {
      return toolError(
        'validation',
        GUIDE_MESSAGES.unknownTopic(
          topic,
          topics.map((each) => each.name)
        )
      );
    }
    return toolResult({ topic, text }, text);
  },
});
