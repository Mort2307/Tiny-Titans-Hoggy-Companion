# Titan AI chat — parked

The Gemini-backed **Ask Titan** chatbot is intentionally separated from the production Powerhouse Intelligence engine.

## Active in production

The V50 Powerhouse Intelligence/data engine remains the authoritative Tiny Titans intelligence layer. It works from Tiny Titans records, confidence, change detection, cross-domain signals, proactive explanations and workspace-scoped data boundaries.

This layer does not require a Gemini API call.

## Parked for later

The following Gemini/chat implementation remains in the repository for later reactivation:

- `functions/titanIntelligence.js`
- `functions/titanIntelligenceModel.js`
- `functions/titanIntelligencePrompt.js`
- `functions/titanIntelligenceProvenance.js`
- `functions/titanIntelligenceAccess.js`
- `functions/titanIntelligenceTools.js`
- `functions/titanIntelligenceData.js`
- `functions/titanIntelligenceUsage.js`
- `functions/titanIntelligenceFeedback.js`
- `src/intelligence/askTitan/*`
- `src/components/TitanIntelligence/AskTitan.tsx`
- related Titan chat UI components

These files are deliberately retained so the work is not lost. The production function surface does not export the Gemini chat callable or its feedback callable, and the active Powerhouse Intelligence pages do not mount the chat UI.

## Reactivation boundary

When the chatbot is revisited, reintroduce it as a separate feature rather than making Gemini a dependency of the core Powerhouse Intelligence engine.
