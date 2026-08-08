import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import SiteShell from '@/components/home/SiteShell';

// The shell reads the route to decide which content the shared column holds.
const route = { pathname: '/' };
jest.mock('next/navigation', () => ({
  usePathname: () => route.pathname,
}));

describe('SiteShell', () => {
  it('renders the identity and the experience resume in the accessible fallback', () => {
    route.pathname = '/';
    render(<SiteShell>{null}</SiteShell>);

    // Name from the identity panel (always in the DOM for SEO / reduced motion).
    expect(screen.getByText('Ilia Dzhiubanskii')).toBeInTheDocument();
    // StaticShowcase renders the real experience list — newest role + section.
    expect(
      screen.getByRole('heading', { name: 'Experience' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Overtone Art')).toBeInTheDocument();
  });

  it('renders the projects column on /projects, and not the resume', () => {
    route.pathname = '/projects';
    render(<SiteShell>{null}</SiteShell>);

    expect(
      screen.getByRole('heading', { name: 'My Projects' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Overtone.art')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Experience' }),
    ).not.toBeInTheDocument();
  });
});
