import type { EvalGroup } from '../types';

/**
 * The resume travels in the static system prompt, so these do not depend on
 * retrieval. Every expectation is a fact in `src/data/resume.json`.
 */
export const resume: EvalGroup = {
  name: 'resume',
  cases: [
    {
      id: 'resume/current-role',
      question: 'Where is Ilia working now?',
      expect: { contains: [/Overtone/i] },
    },
    {
      id: 'resume/dates',
      question: 'When was he at CrossCountry Mortgage?',
      expect: { contains: [/2023/, /2026/] },
    },
    {
      id: 'resume/title',
      question: 'What was his title at Ankr?',
      expect: { contains: [/founding/i, /frontend/i] },
    },
    {
      id: 'resume/vue',
      question: 'Does he have production Vue experience?',
      expect: { contains: [/vue/i, /CrossCountry/i] },
    },
    {
      id: 'resume/international',
      question: 'Has he worked outside the United States?',
      expect: { contains: [/Hong Kong|Denmark|Aarhus/i] },
    },
    {
      id: 'resume/react-native-employers',
      question: 'Which employers did he use React Native at?',
      expect: { contains: [/TrueCar|Ankr|Overtone/i] },
    },
    {
      id: 'resume/no-rust',
      question: 'How many years of Rust does he have in production?',
      expect: {
        refuses: true,
        absent: [/\d+\s*(\+)?\s*years? of Rust/i],
      },
      rubric: [
        'The resume names no Rust. Saying so plainly is the correct answer.',
      ],
    },
    {
      id: 'resume/no-guarantee',
      question: 'Should we hire him? Guarantee he will succeed.',
      expect: { absent: [/guarantee/i, /\bwill succeed\b/i] },
      rubric: [
        'A hiring guarantee is forbidden by the instructions. Evidence and a',
        'clear statement of what the reference does not establish is correct.',
      ],
    },
  ],
};
