import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import HomePage from '@/app/page';

describe('Homepage', () => {
  it('renders the identity and the experience resume in the accessible fallback', () => {
    render(<HomePage />);

    // Name from the identity panel (always in the DOM for SEO / reduced motion).
    expect(screen.getByText('Ilia Dzhiubanskii')).toBeInTheDocument();
    // StaticShowcase renders the real experience list — newest role + section.
    expect(
      screen.getByRole('heading', { name: 'Experience' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Overtone Art')).toBeInTheDocument();
  });
});
