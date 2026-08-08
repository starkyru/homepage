import { Metadata } from 'next';

import { projectsLd } from '@/lib/structured-data';

import { PROJECT_SECTIONS } from '@/components/projects/sections';

export const metadata: Metadata = {
  title: 'My Projects',
  description: 'Open-source projects and apps by Ilia Dzhiubanskii',
  alternates: { canonical: '/projects' },
};

/**
 * The page itself is only its structured data: SiteShell (in the root layout)
 * renders the projects column, because it also owns the identity panel that
 * stays put across the /  ↔ /projects change and the chain that slides out of
 * the way. Keeping the column there is what makes the change a transition
 * rather than a fresh page.
 */
export default function ProjectsPage() {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          projectsLd(PROJECT_SECTIONS.flatMap((s) => s.projects)),
        ),
      }}
    />
  );
}
