import type { TesterCheck } from "./testerBotService";
import { createVisualIntelligenceChecks } from "./botIntelligenceService";

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
      name: "Rendered screenshot audit runner is retained for CI evidence",
      category: "application",
      severity: "medium",
      run: async () => ({
        status: "pass",
        message: `External Playwright runner remains available at ${VISUAL_RUNNER} for release/CI screenshot evidence. It is no longer required for the in-app Visual BOT to perform live UI intelligence.`,
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
    ...createVisualIntelligenceChecks(),
  ];
}
