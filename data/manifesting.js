/*
 * MANIFESTING: dishes I want to cook.
 *
 * Fields:
 *   title      (required)
 *   priority   "critical" | "high" | "medium" | "low"
 *   added      "YYYY-MM-DD"
 *   note       why, where I had it, what to try (optional)
 *   link       a recipe or video to start from (optional)
 *   done       "YYYY-MM-DD" once it's cooked; it moves to "Manifested" (optional)
 *   recipe     once it's written up, the slug of its entry in recipes.js;
 *              it then moves to "Manifested" and links to the recipe
 *
 * Ideas added or checked off on the site are saved in that browser only; nothing a visitor does
 * changes this file. To make mine permanent, export a backup (Settings) or use "Copy as data",
 * and merge it in here. Once an idea is in this file, the browser's own copy is dropped.
 */
CM.manifesting = [
    { title: "Pistachio-Crusted Lamb Chops", priority: "critical", added: "2026-10-15" },
    { title: "Potato Gratin", priority: "high" },
    { title: "Thai Tea Ice Cream", priority: "low" },
    { title: "Josh's Biryani", priority: "low" },
];
