# Ilia Dzhiubanskii — Senior/Lead Software Engineer

## Who am I?

Senior Software Engineer with 20+ years of experience specializing in Vue, React, and React Native application development. Proven track record of leading frontend teams, architecting scalable solutions, and delivering high-impact features for enterprise and consumer products. Early adopter of AI-assisted development workflows, driving measurable gains in team velocity and code quality.

**Languages & Frameworks:** TypeScript, JavaScript, Vue.js, React, Next.js, React Native, Redux, Ionic, Ember.js
**Styling & UI:** CSS, Tailwind, Bootstrap, Material UI, SASS
**Tools & Infrastructure:** Git, GraphQL, REST, Jest, Playwright, Storybook, Jira, ESLint, CI/CD pipelines
**AI & Productivity:** Claude Code, Codex, Copilot — code generation, automated review, test generation, documentation

## About This Project

ilia.to - Personal portfolio site built with Next.js App Router and React 19. The homepage is an interactive hanging-chain scene simulated with [Planck](https://piqnt.com/planck.js) (a JavaScript port of Box2D): experience cards are rigid bodies swinging from jointed ropes, technology chips are welded to their borders and can be snapped off to fall and pile up, and everything can be dragged, shoved into its neighbours and reset. Its content is generated from a Google Docs resume: `pnpm update:resume` parses the doc export into `src/data/resume.json`, which drives the experience cards, the technology stack ball, and the intro copy. A floating PDF download links straight to the same doc. CI/CD pipeline with GitHub Actions, Husky pre-commit hooks, and automated linting/typechecking/testing.

The site includes a day/night mode switcher with hand-crafted canvas animations — an animated sun with rotating rays and grain noise in day mode, and an animated crescent moon with twinkling stars and pulsing wave rings at night. Both celestial bodies respond to hover with scaling and speed changes, and the transition between modes is fully animated with eased color interpolation.

A "pool mode" toggle activates an interactive water caustics effect powered by [ripple-text](https://www.npmjs.com/package/ripple-text) — the resume text is extracted from the live DOM with pixel-accurate positioning, then rendered on a physics-driven canvas where characters float on simplex noise water patterns and react to click-driven ripples with spring restoration. The effect supports pluggable field and ripple algorithms, exposable settings, and adapts its color palette to the current day/night theme.
