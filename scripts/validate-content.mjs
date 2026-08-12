import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const chapterDirectory = path.join(root, 'src', 'data', 'chapters');
const chapterFiles = fs.readdirSync(chapterDirectory)
  .filter((name) => /^ch\d+\.ts$/.test(name))
  .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
const errors = [];

function loadChapter(fileName) {
  const source = fs.readFileSync(path.join(chapterDirectory, fileName), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports }, { filename: fileName });
  const exported = Object.values(module.exports);
  if (exported.length !== 1) errors.push(`${fileName}: expected exactly one exported chapter`);
  return exported[0];
}

const chapters = chapterFiles.map(loadChapter).filter(Boolean);
if (chapters.length !== 12) errors.push(`expected 12 chapter definitions, found ${chapters.length}`);

const ids = new Set();
const orders = new Set();
const moduleCounts = { think: 0, solve: 0, ship: 0 };

for (const chapter of chapters) {
  const label = chapter.id || '(missing id)';
  if (!/^ch\d+$/.test(chapter.id)) errors.push(`${label}: invalid id`);
  if (ids.has(chapter.id)) errors.push(`${label}: duplicate id`);
  ids.add(chapter.id);
  if (!Number.isInteger(chapter.order) || chapter.order < 1 || chapter.order > 12) errors.push(`${label}: order must be an integer from 1 to 12`);
  if (orders.has(chapter.order)) errors.push(`${label}: duplicate order ${chapter.order}`);
  orders.add(chapter.order);
  if (!(chapter.module in moduleCounts)) errors.push(`${label}: unknown module ${chapter.module}`);
  else moduleCounts[chapter.module] += 1;

  for (const field of ['title', 'mentalModel', 'outcome', 'recognitionCue', 'lesson', 'starterCode', 'hiddenTestCode']) {
    if (typeof chapter[field] !== 'string' || chapter[field].trim().length === 0) errors.push(`${label}: ${field} is empty`);
  }
  if (!chapter.starterCode?.includes('package main') || !chapter.starterCode?.includes('func main()')) errors.push(`${label}: starter code needs package main and func main()`);
  if (!chapter.hiddenTestCode?.includes('__GO_SHIFT_TEST__')) errors.push(`${label}: hidden tests do not report structured test markers`);
  if ('validate' in chapter) errors.push(`${label}: legacy source-token validator is still present`);

  const prediction = chapter.prediction;
  if (!prediction?.prompt || !Array.isArray(prediction.options) || prediction.options.length < 2) errors.push(`${label}: prediction needs a prompt and at least two options`);
  else {
    const optionIds = new Set(prediction.options.map((option) => option.id));
    if (optionIds.size !== prediction.options.length) errors.push(`${label}: prediction option ids must be unique`);
    if (!optionIds.has(prediction.correctOptionId)) errors.push(`${label}: correct prediction option does not exist`);
    for (const option of prediction.options) {
      if (!option.label || !option.explanation) errors.push(`${label}: every prediction option needs a label and explanation`);
    }
  }

  if (!chapter.challenge?.title || !chapter.challenge?.description) errors.push(`${label}: challenge needs a title and description`);
  if (!Array.isArray(chapter.testNames) || chapter.testNames.length < 3 || new Set(chapter.testNames).size !== chapter.testNames.length) errors.push(`${label}: provide at least three unique behavioral test names`);
  else for (const testName of chapter.testNames) if (!chapter.hiddenTestCode.includes(testName)) errors.push(`${label}: hidden test code does not mention “${testName}”`);
  if (!Array.isArray(chapter.hints) || chapter.hints.length !== 3 || chapter.hints.some((hint) => !hint.trim())) errors.push(`${label}: provide exactly three progressive hints`);
  if (!chapter.debrief?.title || !chapter.debrief?.summary || !chapter.debrief?.transfer) errors.push(`${label}: debrief needs title, summary, and transfer question`);
}

const expectedOrders = Array.from({ length: 12 }, (_, index) => index + 1);
if (expectedOrders.some((order) => !orders.has(order))) errors.push('chapter orders must cover every position from 1 through 12');
if (moduleCounts.think !== 5 || moduleCounts.solve !== 3 || moduleCounts.ship !== 4) errors.push(`module counts should be think=5, solve=3, ship=4; got ${JSON.stringify(moduleCounts)}`);

if (errors.length) {
  console.error('Content validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Content validation passed: ${chapters.length} labs, orders 1–12, modules 5/3/4, complete learning contracts.`);
