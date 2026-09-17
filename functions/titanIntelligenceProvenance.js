function buildTitanProvenance({ toolCalls = [], webSources = [] } = {}) {
  const userTools = toolCalls.filter((call) => call.kind === "user_data");
  const calculatedTools = toolCalls.filter((call) => call.kind === "calculated_data");
  return {
    categories: [
      ...(userTools.length ? ["USER_DATA"] : []),
      ...(calculatedTools.length ? ["CALCULATED_DATA"] : []),
      ...(webSources.length ? ["EXTERNAL_SOURCE"] : []),
      "AI_INTERPRETATION",
    ],
    userDataUsed: userTools.length > 0,
    calculatedDataUsed: calculatedTools.length > 0,
    externalSourcesUsed: webSources.length > 0,
    aiInterpretationUsed: true,
    creatorAuthorshipClaim: false,
    statement: "This response is generated from the information made available to Titan Intelligence. It is not a personal claim, opinion, diagnosis or direct advice from the Tiny Titans creator.",
  };
}

module.exports = { buildTitanProvenance };