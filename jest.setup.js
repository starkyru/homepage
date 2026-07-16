import '@testing-library/jest-dom';

// Allow router mocks.
// eslint-disable-next-line no-undef
jest.mock('next/router', () => require('next-router-mock'));

// jsdom has no matchMedia; the home page reads prefers-reduced-motion to gate
// the physics view. Report reduced-motion so the accessible static fallback
// renders (no rAF/physics loops) during tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: /reduce/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});
