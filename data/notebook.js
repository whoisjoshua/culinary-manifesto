/*
 * NOTEBOOK: my own kitchen wishlist (tools, pantry, ingredients to find) and loose notes.
 *
 * wishlist items:  { item, kind: "tool" | "pantry" | "other", note?, link?, got?: "YYYY-MM-DD" }
 * notes:           { title, date: "YYYY-MM-DD", body }      (blank lines in body start new paragraphs)
 *
 * Anything added on the site is saved in that browser only; nothing a visitor does changes this
 * file. To make mine permanent, export a backup (Settings) or use "Copy as data", and merge it in
 * here. Once an entry is in this file, the browser's own copy is dropped. For example:
 *
 *   wishlist: [
 *       { item: "Carbon steel wok", kind: "tool", note: "14 inch, flat bottom" },
 *       { item: "地瓜粉", kind: "pantry", note: "for 炸虾" },
 *   ],
 *   notes: [
 *       { title: "Herb shop", date: "2026-11-09", body: "Ask about 八珍 packs.\n\nBring the list." },
 *   ],
 */
CM.notebook = {
    wishlist: [],
    notes: [],
};
