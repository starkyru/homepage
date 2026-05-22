// !STARTERCONF You should delete this page

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import HomePage from '@/app/page';

jest.mock('@/components/GallerySlideshow', () => () => null);

describe('Homepage', () => {
  it('renders the resume', () => {
    render(<HomePage />);

    const resumeEmbed = document.querySelector('.resume-embed');
    expect(resumeEmbed).toBeInTheDocument();
  });
});
