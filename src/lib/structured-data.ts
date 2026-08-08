import resume from '@/data/resume.json';

import { siteConfig } from '@/constant/config';

/**
 * schema.org JSON-LD, generated from the same resume.json the page renders.
 *
 * This is the load-bearing copy for machine readers. Search crawlers and LLM
 * agents that never execute JS still get the server HTML (the "boring" resume),
 * but a crawler that *does* render sees that block hidden by CSS once the
 * interactive chain mounts — JSON-LD is render-independent, so it is the one
 * representation that is identical for every consumer. Keep it in sync with the
 * doc by deriving everything here, never by hand.
 */

// Stable @ids let the graphs on different pages refer to one another instead of
// each page minting a separate, unlinked Person.
export const PERSON_ID = `${siteConfig.url}/#person`;
export const WEBSITE_ID = `${siteConfig.url}/#website`;

/** "Charlotte, NC, USA" → a PostalAddress. Locality is the only part the doc
 *  always supplies; region and country are filled in when they are there. */
function postalAddress(raw: string) {
  const parts = raw
    .replace(/\s*\([^)]*\)/g, '') // "Charlotte (Waxhaw)" → "Charlotte"
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return undefined;
  const [locality, ...rest] = parts;
  const address: Record<string, string> = {
    '@type': 'PostalAddress',
    addressLocality: locality,
  };
  // A bare two-letter token is a US state; anything else at the tail is a
  // country ("Aarhus, Denmark" has no region at all).
  if (rest.length === 2) {
    address.addressRegion = rest[0];
    address.addressCountry = rest[1];
  } else if (rest.length === 1) {
    if (/^[A-Z]{2}$/.test(rest[0])) {
      // A bare state code with no country is US shorthand ("Charlotte, NC").
      // Naming the country is what lets a consumer disambiguate the locality.
      address.addressRegion = rest[0];
      address.addressCountry = 'US';
    } else {
      address.addressCountry = rest[0];
    }
  }
  return address;
}

/** "08/2023 – 02/2026" → ISO 8601 partial dates. "present" has no end date. */
function period(raw: string): { startDate?: string; endDate?: string } {
  const [from, to] = raw.split(/\s*[–-]\s*/).map((s) => s.trim());
  const iso = (s?: string) => {
    if (!s || /present|now/i.test(s)) return undefined;
    const mm = s.match(/^(\d{2})\/(\d{4})$/);
    if (mm) return `${mm[2]}-${mm[1]}`;
    const yy = s.match(/^(\d{4})$/);
    return yy ? yy[1] : undefined;
  };
  return { startDate: iso(from), endDate: iso(to) };
}

// The doc's last entry is a synthetic "Earlier" bucket summarising two decades,
// not an employer. Emitting it as an Organization would invent a company.
const REAL_JOBS = resume.experience.filter((e) => e.id !== 'earlier');

const ALL_SKILLS = resume.skills
  .flatMap((g) => g.items)
  .filter((s, i, all) => all.indexOf(s) === i);

function organizationRole(job: (typeof resume.experience)[number]) {
  const { startDate, endDate } = period(job.periodRaw);
  return {
    '@type': 'OrganizationRole',
    roleName: job.role,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    description: job.description,
    worksFor: {
      '@type': 'Organization',
      name: job.company,
      ...(job.url ? { url: job.url } : {}),
      ...(job.location
        ? { address: postalAddress(job.location) ?? undefined }
        : {}),
    },
  };
}

/** The site-wide identity. Everything else links to it by @id. */
export function personLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: resume.name,
    url: siteConfig.url,
    image: `${siteConfig.url}/opengraph-image`,
    jobTitle: resume.title,
    description: resume.summary,
    email: `mailto:${resume.contacts.email}`,
    address: postalAddress(resume.location),
    sameAs: resume.contacts.links.filter((l) => !l.startsWith(siteConfig.url)),
    knowsAbout: ALL_SKILLS,
    knowsLanguage: ['en'],
    hasOccupation: {
      '@type': 'Occupation',
      name: resume.title,
      occupationalCategory: '15-1252.00', // O*NET: Software Developers
      skills: ALL_SKILLS.join(', '),
    },
    // Current role first — consumers that read a single value get the right one.
    worksFor: REAL_JOBS.map(organizationRole),
    alumniOf: resume.education.map((ed) => ({
      '@type': 'EducationalOrganization',
      name: ed.school,
      ...(ed.field ? { department: ed.field } : {}),
    })),
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: siteConfig.url,
    name: siteConfig.title,
    description: siteConfig.description,
    inLanguage: 'en',
    publisher: { '@id': PERSON_ID },
  };
}

/** Home page: declares the page itself as a profile *about* the Person. */
export function profilePageLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${siteConfig.url}/#profile`,
    url: `${siteConfig.url}/`,
    name: `${siteConfig.title} — ${siteConfig.tagline}`,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': PERSON_ID },
    mainEntity: { '@id': PERSON_ID },
    inLanguage: 'en',
  };
}

/** Projects page: an ordered list so each project is an addressable entity. */
export function projectsLd(
  projects: { name: string; description: string; url?: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${siteConfig.url}/projects#page`,
    url: `${siteConfig.url}/projects`,
    name: 'My Projects',
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: 'en',
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: projects.length,
      itemListElement: projects.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'SoftwareApplication',
          name: p.name,
          description: p.description,
          applicationCategory: 'DeveloperApplication',
          ...(p.url ? { url: p.url } : {}),
          author: { '@id': PERSON_ID },
        },
      })),
    },
  };
}
