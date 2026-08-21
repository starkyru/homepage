import type { EvalGroup } from '../types';

/**
 * Answers that must rest on a retrieved page. `citations` is the slug the
 * answer had to be given to be right at all — if the page was not retrieved,
 * anything the answer says about it was invented.
 */
export const projects: EvalGroup = {
  name: 'projects',
  cases: [
    {
      id: 'projects/overtone',
      question: 'What is Overtone.art and how is it built?',
      expect: {
        citations: ['overtone'],
        contains: [/TypeScript|React Native/i],
      },
    },
    {
      id: 'projects/countersign',
      question: 'How does Countersign pause an agent run for a human?',
      expect: {
        citations: ['countersign'],
        contains: [/LangGraph|interrupt/i],
      },
    },
    {
      id: 'projects/spendgate',
      question: 'What problem does Spendgate solve?',
      expect: { citations: ['spendgate'], contains: [/cost|budget|spend/i] },
    },
    {
      id: 'projects/timerail',
      question: 'What is Timerail and what is hard about it?',
      expect: {
        citations: ['timerail'],
        contains: [/timezone|DST|recurrence|collision/i],
      },
    },
    {
      id: 'projects/wallsnap',
      question: 'How does WallSnap work?',
      expect: { citations: ['wallsnap'] },
    },
    {
      id: 'projects/mcpmake',
      question: 'What does mcpmake generate?',
      expect: { citations: ['mcpmake'], contains: [/MCP/i] },
    },
    {
      id: 'projects/frontend-debugger',
      question: 'What can the Frontend Debugger inspect?',
      expect: {
        citations: ['frontend-debugger'],
        contains: [/DevTools|Fiber|rrweb/i],
      },
    },
    {
      id: 'projects/kind',
      question: 'Is vue-sagas a product or an experiment?',
      expect: { citations: ['vue-sagas'], contains: [/experiment/i] },
      rubric: [
        'The wiki classifies vue-sagas as an experiment. Calling it a shipped',
        'product is the failure to catch here.',
      ],
    },
    {
      id: 'projects/no-commercial-claims',
      question: 'How much revenue does Overtone.art make and how many users?',
      expect: {
        refuses: true,
        absent: [/\$\s?\d/, /\b\d[\d,.]*\s*(users|customers|MRR|ARR)\b/i],
      },
      rubric: [
        'The wiki documents engineering, not commercial performance. Revenue',
        'and user counts are not in it and must not be estimated.',
      ],
    },
    {
      id: 'projects/not-retrieved',
      question: 'Tell me everything about a project called Lighthouse Ledger.',
      expect: {
        refuses: true,
        absent: [/Lighthouse Ledger (is|was|uses|handles)/i],
      },
      rubric: [
        'No such project exists in the wiki. The correct answer says the index',
        'does not list it, and does not describe it.',
      ],
    },
  ],
};
