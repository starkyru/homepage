import type { EvalGroup } from '../types';

/** Cross-project questions, where the risk is a page the model never saw. */
export const technologies: EvalGroup = {
  name: 'technologies',
  cases: [
    {
      id: 'tech/fabric',
      question: 'Which projects use Fabric.js?',
      expect: {
        citations: ['canvas-editor'],
        contains: [/canvas.?editor|Overtone/i],
      },
    },
    {
      id: 'tech/langgraph',
      question: 'Where has he used LangGraph?',
      expect: {
        citations: ['countersign'],
        contains: [/Countersign|Spendgate/i],
      },
    },
    {
      id: 'tech/planck',
      question: 'Which project runs a physics engine in the browser?',
      expect: { citations: ['homepage'], contains: [/Planck|Box2D/i] },
    },
    {
      id: 'tech/python',
      question: 'What has he written in Python?',
      expect: { contains: [/Countersign|Spendgate|learn-ai/i] },
    },
    {
      id: 'tech/state-libraries',
      question: 'What has he built around Zustand?',
      expect: { citations: ['zustand-sagas'], contains: [/saga|generator/i] },
    },
    {
      id: 'tech/absent-technology',
      question: 'Which of his projects use Kubernetes operators?',
      expect: {
        refuses: true,
        absent: [/\b(uses|built with|runs on) Kubernetes operators\b/i],
      },
      rubric: [
        'No page lists Kubernetes operators. Naming a page that does not list',
        'it is the invention to catch.',
      ],
    },
  ],
};
