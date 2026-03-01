// !STARTERCONF You should delete this page

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import HomePage from '@/app/page';

describe('Homepage', () => {
  it('renders the resume and PDF download link', () => {
    render(<HomePage />);

    const pdfLink = screen.getByTitle('Download resume as PDF');
    expect(pdfLink).toBeInTheDocument();

    const resumeEmbed = document.querySelector('.resume-embed');
    expect(resumeEmbed).toBeInTheDocument();
  });
});
