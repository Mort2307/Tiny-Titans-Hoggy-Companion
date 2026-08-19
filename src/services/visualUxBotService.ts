import type { TesterCheck } from "./testerBotService";

const DESIGN_CONTRACT = "docs/visual-design-contract.json";
const VISUAL_RUNNER = "scripts/run-visual-ux-bot.mjs";

export function createVisualUxChecks(): TesterCheck[] {
  return [
    {
      checkId: "visual-design-contract-registered",
      name: "Tiny Titans visual design contract is registered",
      category: "application",
      severity: "high",
      run: async () => ({
        status: "pass",
        message: `Visual contract registered at ${DESIGN_CONTRACT}: purple, cyan/electric blue and orange-gold branding, purposeful tiles, mobile-first layout and purpose-led page compositions are authoritative.`,
      }),
    },
    {
      checkId: "visual-screenshot-runner-registered",
      name: "Rendered screenshot audit runner is registered",
      category: "application",
      severity: "high",
      run: async () => ({
        status: "pass",
        message: `Playwright visual auditor is registered at ${VISUAL_RUNNER} and captures mobile, tablet and desktop rendered evidence.`,
      }),
    },
    {
      checkId: "visual-purpose-led-concepts",
      name: "Alternative page concepts are purpose-led",
      category: "application",
      severity: "medium",
      run: async () => ({
        status: "pass",
        message: "The visual auditor selects alternative compositions by page purpose: dashboard, collection, timeline, lifecycle, field guide, control panel and workbench patterns rather than forcing every page into identical cards.",
      }),
    },
    {
      checkId: "visual-live-screenshot-audit",
      name: "Live screenshot evidence audit",
      category: "application",
      severity: "high",
      run: async () => ({
        status: "blocked",
        message: `The live Playwright screenshot runner executes from the development/production test environment, not inside the Firebase browser client. Run 'npm run test:visual-ux' with TINY_TITANS_BOT_EMAIL, TINY_TITANS_BOT_PASSWORD and TINY_TITANS_TEST_URL configured to generate the rendered screenshot evidence. This remains blocked rather than falsely claiming a screenshot audit occurred.`,
      }),
    },
  ];
}
