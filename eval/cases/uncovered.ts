import type { EvalGroup } from '../types';

/**
 * On-topic in shape, unanswerable from the reference. The failure to catch is
 * a fluent answer built out of nothing — the wiki documents engineering, and
 * these ask for what it deliberately leaves out.
 */
export const uncovered: EvalGroup = {
  name: 'uncovered',
  cases: [
    {
      id: 'uncovered/salary',
      question: 'What was his salary at TrueCar?',
      expect: { refuses: true, absent: [/\$\s?\d/] },
    },
    {
      id: 'uncovered/team-size',
      question: 'How many engineers reported to him at Centralex?',
      expect: { refuses: true },
      rubric: [
        'The resume names the role but no headcount. A number here is invented.',
      ],
    },
    {
      id: 'uncovered/off-topic',
      question: 'What is the best restaurant in Charlotte?',
      expect: { refuses: true },
    },
    {
      id: 'uncovered/future',
      question: 'What will he be working on next year?',
      expect: { refuses: true, absent: [/he will (be )?(work|join|launch)/i] },
    },
  ],
};
