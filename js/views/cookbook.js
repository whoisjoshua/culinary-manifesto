/*
 * Cookbook: every recipe, laid out like the Manifesting list. Search, category filters and sort;
 * drafts (status: "draft") sit in their own section underneath, the way Manifested does.
 */
(function (CM) {
    "use strict";
    const { esc, pad, $, $$, isCJK } = CM.util;

    function searchText(r) {
        const items = r.sections.flatMap((s) => s.items.map((it) => (typeof it === "string" ? it : [it.text, it.en, it.note].join(" "))));
        return [r.title, r.py, r.en, r.category, (r.tags || []).join(" "), items.join(" ")].join(" ").toLowerCase();
    }

    // n = the recipe's number in data/recipes.js, so it stays the same whatever the sort
    const sorters = {
        written: (a, b) => a.n - b.n,
        newest: (a, b) => String(b.r.added || "").localeCompare(String(a.r.added || "")) || b.n - a.n,
        az: (a, b) => (a.r.en || a.r.title).localeCompare(b.r.en || b.r.title),
        category: (a, b) => String(a.r.category || "~").localeCompare(String(b.r.category || "~")) || a.n - b.n,
    };

    function rowHTML({ r, n }) {
        const meta = [r.py, r.time].filter(Boolean).join(" · ");
        return `
        <li class="c-row" data-slug="${esc(r.slug)}">
            <a class="row m-row" href="#/r/${esc(r.slug)}">
                <span class="c-num mono" aria-hidden="true">${pad(n)}</span>
                <span class="row-body">
                    <span class="m-title${isCJK(r.title) ? " zh" : ""}">${esc(r.title)}</span>
                    ${r.en ? `<span class="row-en">${esc(r.en)}</span>` : ""}
                    ${meta ? `<span class="m-meta mono">${esc(meta)}</span>` : ""}
                </span>
                <span class="m-side">
                    ${r.category ? `<span class="prio prio--none mono">${esc(r.category)}</span>` : "<span></span>"}
                    <span class="icon-btn sm c-go" aria-hidden="true">${CM.icon("arrowR")}</span>
                </span>
            </a>
        </li>`;
    }

    CM.views.cookbook = {
        title: () => `Cookbook · ${CM.site.title}`,
        render(main) {
            const all = CM.recipes.map((r, i) => ({ r, n: i + 1, text: searchText(r) }));
            const cats = [];
            all.forEach(({ r }) => r.category && !cats.includes(r.category) && cats.push(r.category));
            let sort = CM.store.get("cookbook:sort", "written");
            if (!sorters[sort]) sort = "written";
            let cat = "";

            main.innerHTML = `
            <section class="page-hero wrap">
                <p class="kicker mono">(01) The recipes</p>
                <h1 class="page-title"><span class="line"><span><em>Cookbook</em></span></span></h1>
                <p class="lede">Everything I've cooked, written down to cook again. Tap one to cook along.</p>
            </section>
            <section class="wrap m-wrap">
                <div class="list-bar c-bar">
                    <p class="list-count mono" aria-live="polite"></p>
                    <label class="search">
                        ${CM.icon("search")}
                        <input type="search" id="q" placeholder="Search recipes, ingredients…" autocomplete="off" aria-label="Search recipes">
                        <kbd class="mono hide-sm">/</kbd>
                    </label>
                    <label class="select mono"><span class="sr">Sort</span>
                        <select id="c-sort">
                            <option value="written">As written</option>
                            <option value="newest">Newest first</option>
                            <option value="az">A to Z</option>
                            <option value="category">By category</option>
                        </select>
                    </label>
                </div>
                <div class="chips c-chips" role="group" aria-label="Filter by category">
                    <button type="button" class="chip-f is-on" data-cat="">All <span>${all.length}</span></button>
                    ${cats.map((c) => `<button type="button" class="chip-f" data-cat="${esc(c)}">${esc(c)} <span>${all.filter(({ r }) => r.category === c).length}</span></button>`).join("")}
                </div>
                <ol class="checklist m-list c-list" id="c-ready"></ol>
                <p class="empty" id="c-empty" hidden>Nothing matches that. Maybe it's one to <a href="#/manifesting">manifest</a>.</p>
                <h2 class="sub-title" id="c-draft-title" hidden><em>Drafts</em> <sup class="mono"></sup></h2>
                <ol class="checklist m-list m-list--done c-list" id="c-draft"></ol>
            </section>`;

            const q = $("#q", main);
            const sel = $("#c-sort", main);
            sel.value = sort;

            function paint() {
                const needle = q.value.trim().toLowerCase();
                const shown = all.filter((x) => (!cat || x.r.category === cat) && (!needle || x.text.includes(needle))).sort(sorters[sort]);
                const ready = shown.filter((x) => x.r.status !== "draft");
                const drafts = shown.filter((x) => x.r.status === "draft");
                $("#c-ready", main).innerHTML = ready.map(rowHTML).join("");
                $("#c-draft", main).innerHTML = drafts.map(rowHTML).join("");
                $("#c-empty", main).hidden = shown.length > 0;
                $("#c-draft-title", main).hidden = !drafts.length;
                $("#c-draft-title sup", main).textContent = `(${pad(drafts.length)})`;
                $(".list-count", main).textContent = `${pad(ready.length)} recipe${ready.length === 1 ? "" : "s"} · ${pad(drafts.length)} draft${drafts.length === 1 ? "" : "s"}`;
            }

            q.addEventListener("input", paint);
            sel.addEventListener("change", () => {
                sort = sel.value;
                CM.store.set("cookbook:sort", sort);
                paint();
            });
            $(".c-chips", main).addEventListener("click", (e) => {
                const b = e.target.closest(".chip-f");
                if (!b) return;
                cat = b.dataset.cat;
                $$(".c-chips .chip-f", main).forEach((x) => x.classList.toggle("is-on", x === b));
                paint();
            });
            const onKey = (e) => {
                if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) {
                    e.preventDefault();
                    q.focus();
                }
            };
            document.addEventListener("keydown", onKey);

            paint();
            return () => document.removeEventListener("keydown", onKey);
        },
    };
})(window.CM);
