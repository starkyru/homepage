import { Instrument_Sans, Newsreader } from 'next/font/google';

// Display serif for the identity panel; grotesque sans for the body / physics stage.
export const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument',
  display: 'swap',
});

export const homeFontVars = `${newsreader.variable} ${instrumentSans.variable}`;
