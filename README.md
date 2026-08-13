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

## Portfolio chat (optional)

The floating “Ask about Ilia” chat is disabled unless `OPENAI_API_KEY` is set in a local `.env` file. The key is used only by the server route and is never sent to visitors.

```env
OPENAI_API_KEY=your_key_here
# Optional; defaults to gpt-4.1-mini
OPENAI_MODEL=gpt-4.1-mini
```

The assistant answers from three trusted sources: `src/data/resume.json`, the standing guidance in `src/data/portfolio-wiki.ts`, and the projects wiki in `content/wiki/` — 31 public-safe Markdown pages covering the architecture and technology of each project. Visitor messages are treated as untrusted input: they select which wiki pages are retrieved, but they cannot modify the assistant’s reference material or instructions.

Edit the wiki as Markdown and run `pnpm wiki` to recompile `src/data/wiki.generated.json` (`pnpm build` does this too). The same corpus is served at `/llms-full.txt`, and summarised in `/llms.txt`.

A "pool mode" toggle activates an interactive water caustics effect powered by [ripple-text](https://www.npmjs.com/package/ripple-text) — the resume text is extracted from the live DOM with pixel-accurate positioning, then rendered on a physics-driven canvas where characters float on simplex noise water patterns and react to click-driven ripples with spring restoration. The effect supports pluggable field and ripple algorithms, exposable settings, and adapts its color palette to the current day/night theme.
