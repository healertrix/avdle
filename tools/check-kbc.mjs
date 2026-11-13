// Checks the Crorepati question bank: shape, answers, duplicates and leftover drafting text.
// Run: node tools/check-kbc.mjs
import fs from "node:fs";
import vm from "node:vm";

const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
const files = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8").match(/data\/kbc[^"?]*\.js/g);
for (const f of files) vm.runInContext(fs.readFileSync(new URL("../" + f, import.meta.url), "utf8"), ctx, { filename: f });
const D = ctx.KBC_DATA;
const problems = [];
const BAD = /\.\.\.|…\s*(no|rather)|\brather,|\bno[:;]|placeholder|needs checking|\bTODO\b/i;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const seen = new Map();

D.tiers.forEach((tier, t) =>
  tier.forEach((q, i) => {
    const at = `tier ${t} #${i}`;
    const [text, opts, ans, why] = q;
    if (q.length !== 4 || typeof text !== "string" || !Array.isArray(opts) || opts.length !== 4 || typeof why !== "string")
      return problems.push(`${at}: wrong shape`);
    if (!(ans >= 0 && ans < 4)) problems.push(`${at}: bad answer index`);
    if (new Set(opts.map(norm)).size !== 4) problems.push(`${at}: repeated option in "${text}"`);
    if (opts.some((o) => !String(o).trim())) problems.push(`${at}: empty option`);
    if (why.length < 12) problems.push(`${at}: solution too short: "${text}"`);
    if (BAD.test(text.replace(/'[^']*…'/g, "")) || BAD.test(why)) problems.push(`${at}: drafting text left in: "${text}"`);
    const k = norm(text);
    if (seen.has(k)) problems.push(`${at}: duplicate of ${seen.get(k)}: "${text}"`);
    seen.set(k, at);
  })
);
D.fff.forEach((q, i) => {
  const [text, items, order, why] = q;
  const ok = items.length === 4 && order.length === 4 && [...order].sort().join() === "0,1,2,3";
  if (!ok) problems.push(`fff #${i}: order must use each of 0–3 once: "${text}"`);
  if (BAD.test(text) || BAD.test(why)) problems.push(`fff #${i}: drafting text left in`);
  // the solution lists the items in order; check the first and last ones appear in that order
  const pos = order.map((j) => why.toLowerCase().indexOf(String(items[j]).toLowerCase().replace(/^the /, "")));
  if (pos.every((p) => p >= 0) && pos.some((p, j) => j && p < pos[j - 1])) problems.push(`fff #${i}: solution order disagrees with answer: "${text}"`);
});

console.log("Crorepati tiers:", D.tiers.map((t) => t.length).join(" / "), "=", D.tiers.flat().length, "questions;", D.fff.length, "Fastest Finger First");
if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log("All Crorepati checks passed.");
