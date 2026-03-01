// !STARTERCONF You should delete this page

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import HomePage from '@/app/page';

describe('Homepage', () => {
  it('renders the Components', () => {
    render(<HomePage />);

    const heading = screen.getByText(
      /Ilia Dzhiubanskii - Senior Software Developer/i,
    );

    expect(heading).toBeInTheDocument();
  });
});
