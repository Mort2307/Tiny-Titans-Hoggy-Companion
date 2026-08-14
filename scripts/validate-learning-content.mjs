import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "src", "data");
const files = fs.readdirSync(dataDir).filter((name) => /ChallengeQuestions|learningQuestionBanks\.ts$/.test(name));

const seenIds = new Map();
const seenPrompts = new Map();
const errors = [];
let questionCount = 0;

for (const file of files) {
  const fullPath = path.join(dataDir, file);
  const source = fs.readFileSync(fullPath, "utf8");
  const questionBlocks = source.split(/\n\s*\{\s*id:\s*"/).slice(1);

  for (const tail of questionBlocks) {
    const idMatch = tail.match(/^([^"\\]+)"/);
    const id = idMatch?.[1];
    if (!id) continue;
    questionCount += 1;

    const promptMatch = tail.match(/prompt:\s*"((?:\\.|[^"\\])*)"/);
    const prompt = promptMatch?.[1];
    const bankMatch = tail.match(/\bbank:\s*([1-5])/);
    const difficultyMatch = tail.match(/\bdifficulty:\s*([1-5])/);
    const correctMatch = tail.match(/\bcorrectIndex:\s*(\d+)/);
    const optionsMatch = tail.match(/options:\s*\[([^\]]*)\]/s);
    const explanationMatch = tail.match(/explanation:\s*"((?:\\.|[^"\\])*)"/);

    const location = `${file}#${id}`;
    if (seenIds.has(id)) errors.push(`Duplicate question id '${id}' in ${location}; already defined in ${seenIds.get(id)}.`);
    else seenIds.set(id, location);

    if (prompt) {
      const normalised = prompt.replace(/\\n/g, " ").replace(/\\"/g, '"').trim().toLowerCase().replace(/\s+/g, " ");
      if (seenPrompts.has(normalised)) errors.push(`Duplicate question prompt in ${location}; already defined in ${seenPrompts.get(normalised)}.`);
      else seenPrompts.set(normalised, location);
    }

    if (!bankMatch && !difficultyMatch) errors.push(`${location} has neither a bank nor a difficulty.`);
    if (correctMatch && optionsMatch) {
      const optionCount = optionsMatch[1].split(/,(?=\s*["])/).length;
      const correctIndex = Number(correctMatch[1]);
      if (correctIndex < 0 || correctIndex >= optionCount) errors.push(`${location} has correctIndex ${correctIndex} but appears to have ${optionCount} options.`);
    }
    if (!explanationMatch?.[1]?.trim()) errors.push(`${location} has no usable explanation.`);
  }
}

if (!questionCount) errors.push("No challenge questions were discovered. Check the question-bank file naming/format.");

if (errors.length) {
  console.error(`Learning content validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Learning content validation passed: ${questionCount} question definitions checked across ${files.length} data files.`);
