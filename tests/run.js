/*
 * Logic tests for js/quantity.js and the data files.   Run:  node tests/run.js
 */
"use strict";
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const q = require("../js/quantity.js");

let pass = 0;
let fail = 0;
function eq(actual, expected, label) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) pass++;
    else {
        fail++;
        console.log(`  ✗ ${label}\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`);
    }
}
const fmt = (text, scale, system) => {
    const p = q.parse(text);
    return p ? q.format(p, scale, system) : null;
};

console.log("parse");
eq(q.parse("2 cups water or milk").unit, "cup", "cups");
eq(q.parse("2 cups water or milk").rest, "water or milk", "rest");
eq(q.parse("¼ tsp baking powder").a, 0.25, "unicode fraction");
eq([q.parse("¼ - 1 tsp salt").a, q.parse("¼ - 1 tsp salt").b], [0.25, 1], "range");
eq(q.parse("¾ or ⅔ cup brown sugar").sep, "or", "or-range");
eq(q.parse("1.5 sticks of butter").unit, "stick", "sticks");
eq(q.parse("1 1/2 cups flour").a, 1.5, "mixed number");
eq(q.parse("1½ cups flour").a, 1.5, "mixed glyph");
eq(q.parse("20 g 党参").unit, "g", "grams before CJK");
eq(q.parse("20 g 党参").rest, "党参", "CJK rest");
eq(q.parse("2 lb pork").unit, "lb", "lb (not l)");
eq(q.parse("1 large egg").unit, null, "large is not litres");
eq(q.parse("2 garlic cloves").unit, null, "garlic is not grams");
eq(q.parse("5 cupcakes"), { a: 5, b: null, sep: null, unit: null, src: "5", rest: "cupcakes" }, "cupcakes is not cups");
eq(q.parse("2 tomatoes").b, null, "to- in tomatoes is not a range");
eq(q.parse("Ground pork"), null, "no amount");
eq(q.parse("3 cloves garlic").unit, "clove", "count unit");

console.log("format");
eq(fmt("2 cups water", 1, "original"), "2 cups", "1x original untouched");
eq(fmt("2 cups water", 0.5, "original"), "1 cup", "halve cups");
eq(fmt("1 tbsp sugar", 4, "original"), "¼ cup", "4 tbsp -> ¼ cup");
eq(fmt("1 tbsp sugar", 3, "original"), "3 tbsp", "3 tbsp stays");
eq(fmt("¾ cup sugar", 0.5, "original"), "6 tbsp", "⅜ cup -> 6 tbsp");
eq(fmt("2.5 cups flour", 0.5, "original"), "1¼ cups", "1¼ cups");
eq(fmt("¼ - 1 tsp salt", 2, "original"), "½–2 tsp", "range scale");
eq(fmt("¾ or ⅔ cup brown sugar", 2, "original"), "1½ or 1⅓ cups", "or-range scale");
eq(fmt("1.5 sticks of butter", 2, "original"), "3 sticks", "sticks scale");
eq(fmt("1.5 sticks of butter", 1, "metric"), "170 g", "sticks to grams");
eq(fmt("2 cups water", 1, "metric"), "475 ml", "cups to ml");
eq(fmt("5 cups flour", 1, "metric"), "1.18 l", "cups to litres");
eq(fmt("¼ tsp baking powder", 1, "metric"), "1.2 ml", "tsp to ml");
eq(fmt("1 tbsp sugar", 1, "metric"), "15 ml", "tbsp to ml");
eq(fmt("20 g 党参", 1, "metric"), "20 g", "metric stays");
eq(fmt("20 g 党参", 1.5, "original"), "30 g", "grams scale");
eq(fmt("20 g 党参", 1, "us"), "⅔ oz", "grams to oz (0.71 oz)");
eq(fmt("600 g pork", 2, "metric"), "1.2 kg", "grams to kg");
eq(fmt("1 egg", 2, "original"), "2", "count scale");
eq(fmt("3 cloves garlic", 2, "original"), "6 cloves", "count unit plural");
eq(fmt("250 ml milk", 1, "us"), "1 cup", "ml to cups (singular)");
eq(fmt("2.5 cups flour", 0.4, "original"), "1 cup", "singular after scaling");
eq(fmt("½ cup milk", 1, "metric"), "120 ml", "half cup to ml");

console.log("temperatures and times");
const t = q.findTemps("Bake at 375 - 425 degrees F for 50 - 55 minutes");
eq(t.length, 1, "one temp");
eq(q.formatTemp(t[0], "original"), "375–425 °F", "temp as written");
eq(q.formatTemp(t[0], "metric"), "190–220 °C", "temp to C");
eq(q.formatTemp(q.findTemps("Roast at 200 °C")[0], "us"), "390 °F", "temp to F");
eq(q.findTimes("for 50 - 55 minutes").map((x) => x.minutes), [50], "time range uses lower bound");
eq(q.findTimes("refrigerate it for an hour").map((x) => x.minutes), [60], "an hour");
eq(q.findTimes("simmer 1.5 hours, rest 30 sec").map((x) => x.minutes), [90, 0.5], "hours and seconds");
eq(q.findTimes("add a little salt").length, 0, "no false times");

console.log("data files");
const ctx = { CM: {} };
vm.createContext(ctx);
for (const f of ["site", "glossary", "recipes", "manifesting", "notebook"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "data", f + ".js"), "utf8"), ctx, { filename: f + ".js" });
}
const { recipes, manifesting, notebook } = ctx.CM;
const slugs = recipes.map((r) => r.slug);
eq(new Set(slugs).size, slugs.length, "recipe slugs are unique");
eq(slugs.every((s) => /^[a-z0-9-]+$/.test(s)), true, "slugs are url-safe");
eq(recipes.every((r) => r.title && Array.isArray(r.sections)), true, "every recipe has a title and sections");
eq(
    recipes.every((r) => r.sections.every((s) => s.kind === "ingredients" || s.kind === "steps")),
    true,
    "section kinds are valid"
);
eq(
    manifesting.every((m) => m.title && (!m.priority || ["critical", "high", "medium", "low"].includes(m.priority))),
    true,
    "manifesting priorities are valid"
);
eq(manifesting.filter((m) => m.recipe).every((m) => slugs.includes(m.recipe)), true, "manifested items point at real recipes");
eq(Array.isArray(notebook.wishlist) && Array.isArray(notebook.notes), true, "notebook shape");
const isDate = (d) => d == null || /^\d{4}-\d{2}-\d{2}$/.test(d);
eq(manifesting.every((m) => isDate(m.added) && isDate(m.done)), true, "manifesting dates are YYYY-MM-DD");
eq(notebook.wishlist.every((w) => w.item && isDate(w.got)) && notebook.notes.every((n) => isDate(n.date)), true, "notebook entries are valid");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
