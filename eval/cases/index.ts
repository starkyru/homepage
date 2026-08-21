import { adversarial } from './adversarial';
import { jobFit } from './job-fit';
import { projects } from './projects';
import { resume } from './resume';
import { technologies } from './technologies';
import { uncovered } from './uncovered';
import type { EvalGroup } from '../types';

export const ALL_GROUPS: EvalGroup[] = [
  resume,
  projects,
  technologies,
  jobFit,
  adversarial,
  uncovered,
];

/**
 * `EVAL_ONLY=adversarial,resume` narrows a run. Jest rejects unknown CLI
 * flags, so the knobs are environment variables rather than `--only`.
 */
export function selectedGroups(only = process.env.EVAL_ONLY): EvalGroup[] {
  if (!only) return ALL_GROUPS;

  const wanted = new Set(
    only
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  );
  const groups = ALL_GROUPS.filter((group) => wanted.has(group.name));

  if (!groups.length) {
    const names = ALL_GROUPS.map((group) => group.name).join(', ');
    throw new Error(`EVAL_ONLY matched no group. Available: ${names}`);
  }
  return groups;
}
