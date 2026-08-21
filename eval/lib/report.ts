import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { type CaseResult, JUDGE_AXES } from '../types';

/** Scorecard for one run: a table on stdout, the detail on disk. */

export const REPORT_PATH = resolve(process.cwd(), 'eval/reports/latest.md');

const pct = (value: number) => `${Math.round(value * 100)}%`;

export function mean(values: number[]): number {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

export function byGroup(results: CaseResult[]): Map<string, CaseResult[]> {
  const groups = new Map<string, CaseResult[]>();
  for (const result of results) {
    const bucket = groups.get(result.group) ?? [];
    bucket.push(result);
    groups.set(result.group, bucket);
  }
  return groups;
}

function failedChecks(result: CaseResult): string[] {
  return result.checks
    .filter((check) => !check.passed)
    .map((check) => [check.label, check.detail].filter(Boolean).join(' — '));
}

function caseSection(result: CaseResult): string[] {
  const lines = [`### ${result.id} — ${pct(result.score)}`, ''];

  if (result.error) lines.push(`**Errored:** ${result.error}`, '');
  if (result.repeatScores) {
    lines.push(`Attempts: ${result.repeatScores.map(pct).join(', ')}`, '');
  }

  lines.push(`**Question**\n\n> ${result.question.replace(/\n/g, '\n> ')}`, '');
  lines.push(`**Sources:** ${result.sources.join(', ') || 'none'}`, '');

  const failures = failedChecks(result);
  lines.push(
    failures.length
      ? `**Failed checks**\n\n${failures.map((line) => `- ${line}`).join('\n')}`
      : '**Failed checks:** none',
    '',
  );

  if (result.judge) {
    const axes = JUDGE_AXES.map(
      (axis) => `${axis} ${result.judge?.[axis].toFixed(2)}`,
    ).join(' · ');
    lines.push(`**Judge:** ${axes}`, '', `> ${result.judge.notes}`, '');
  } else if (result.judgeError) {
    lines.push(`**Judge unavailable:** ${result.judgeError}`, '');
  }

  if (result.answer) {
    lines.push(
      '<details><summary>Answer</summary>',
      '',
      result.answer,
      '',
      '</details>',
      '',
    );
  }

  return lines;
}

export interface RunMeta {
  model: string;
  judgeModel: string;
  repeat: number;
  startedAt: string;
}

export function renderReport(results: CaseResult[], meta: RunMeta): string {
  const groups = byGroup(results);
  const lines = [
    '# Chat evaluation',
    '',
    `- Run: ${meta.startedAt}`,
    `- Answering model: \`${meta.model}\``,
    `- Judge: \`${meta.judgeModel}\``,
    `- Repeats per case: ${meta.repeat}`,
    `- Cases: ${results.length}`,
    `- **Suite score: ${pct(mean(results.map((result) => result.score)))}**`,
    '',
    '| Group | Cases | Score |',
    '| --- | --- | --- |',
  ];

  for (const [name, bucket] of groups) {
    lines.push(
      `| ${name} | ${bucket.length} | ${pct(mean(bucket.map((r) => r.score)))} |`,
    );
  }

  const judgeless = results.filter((result) => result.judgeError);
  if (judgeless.length) {
    lines.push(
      '',
      `> ${judgeless.length} case(s) scored without a judge — deterministic checks only.`,
    );
  }

  lines.push('', '## Cases', '');
  for (const result of results) lines.push(...caseSection(result));

  return lines.join('\n');
}

export function writeReport(results: CaseResult[], meta: RunMeta): string {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, renderReport(results, meta), 'utf8');
  return REPORT_PATH;
}

export function summarise(results: CaseResult[]): string {
  const rows = [...byGroup(results)].map(
    ([name, bucket]) =>
      `  ${name.padEnd(14)} ${String(bucket.length).padStart(3)}  ${pct(
        mean(bucket.map((result) => result.score)),
      ).padStart(4)}`,
  );

  const failures = results
    .filter((result) => failedChecks(result).length || result.error)
    .map((result) => `  ✗ ${result.id} — ${pct(result.score)}`);

  return [
    '',
    `  suite ${pct(mean(results.map((result) => result.score)))} over ${results.length} cases`,
    '',
    ...rows,
    ...(failures.length ? ['', '  failing checks:', ...failures] : []),
    '',
    `  report: ${REPORT_PATH}`,
    '',
  ].join('\n');
}
