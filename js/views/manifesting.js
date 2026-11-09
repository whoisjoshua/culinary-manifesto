/*
 * Manifesting: dishes I want to cook. Items from data/manifesting.js plus ideas added in this browser.
 * Checking one off moves it to "Manifested" (saved in this browser). An item with `recipe:` in the
 * data file is manifested for everyone and links to its recipe.
 */
(function (CM) {
    "use strict";
    const { esc, hash, pad, $, $$, fmtDate, today } = CM.util;
    const PRIORITIES = ["critical", "high", "medium", "low"];
    const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

    const same = (s) => String(s || "").trim().toLowerCase();

    CM.manifestingItems = () => {
        const done = CM.store.get("manifest:done", {});
        const fromData = (CM.manifesting || []).map((m) => Object.assign({}, m, { id: "s:" + hash(m.title), local: false }));
        // once an idea added here has been copied into data/manifesting.js, drop the browser copy
        const inData = new Set(fromData.map((m) => same(m.title)));
        let local = CM.store.get("manifest:local", []);
        const kept = local.filter((m) => !inData.has(same(m.title)));
        if (kept.length !== local.length) CM.store.set("manifest:local", (local = kept));
        return fromData.concat(local.map((m) => Object.assign({}, m, { local: true }))).map((m) => {
            const recipe = m.recipe && CM.recipes.find((r) => r.slug === m.recipe);
            // `done` or `recipe` in the data file settles it for everyone; otherwise it's this browser's check
            const locked = !m.local && !!(m.done || recipe);
            return Object.assign(m, { recipeObj: recipe || null, locked, done: (!m.local && m.done) || (recipe ? true : done[m.id] || false) });
        });
    };

    const sorters = {
        priority: (a, b) => (RANK[a.priority] ?? 9) - (RANK[b.priority] ?? 9) || String(b.added || "").localeCompare(String(a.added || "")),
        newest: (a, b) => String(b.added || "").localeCompare(String(a.added || "")),
        az: (a, b) => a.title.localeCompare(b.title),
    };

    function rowHTML(m) {
        const tid = "m-" + m.id.replace(/[^a-z0-9]/gi, "");
        const meta = [
            m.done && m.done !== true ? "Manifested " + fmtDate(m.done) : m.added ? "Added " + fmtDate(m.added) : "",
            m.local ? "on this device" : "",
        ]
            .filter(Boolean)
            .join(" · ");
        return `
        <li class="row m-row${m.done ? " is-done" : ""}" data-id="${esc(m.id)}">
            <input type="checkbox" class="row-input" aria-labelledby="${tid}"${m.done ? " checked" : ""}${m.locked ? " disabled" : ""}>
            <span class="box" aria-hidden="true">${CM.CHECK_SVG}</span>
            <span class="row-body" id="${tid}">
                <span class="row-text m-title">${esc(m.title)}</span>
                ${meta ? `<span class="m-meta mono">${esc(meta)}</span>` : ""}
                ${m.note ? `<span class="row-note">${CM.rich(m.note)}</span>` : ""}
            </span>
            <span class="m-side">
                <span class="prio prio--${esc(m.priority || "none")} mono">${esc(m.priority || "Someday")}</span>
                <span class="m-acts">
                    ${m.recipeObj ? `<a class="icon-btn sm" href="#/r/${esc(m.recipe)}" aria-label="View the recipe" title="View the recipe">${CM.icon("arrowR")}</a>` : ""}
                    ${m.link ? `<a class="icon-btn sm" href="${esc(m.link)}" target="_blank" rel="noopener" aria-label="Open link" title="Open link">${CM.icon("link")}</a>` : ""}
                    ${m.local ? `<button type="button" class="icon-btn sm" data-del="${esc(m.id)}" aria-label="Delete ${esc(m.title)}" title="Delete">${CM.icon("trash")}</button>` : ""}
                </span>
            </span>
        </li>`;
    }

    function asData(items) {
        return items
            .map((m) => {
                const parts = [`title: ${JSON.stringify(m.title)}`];
                if (m.priority) parts.push(`priority: ${JSON.stringify(m.priority)}`);
                if (m.added) parts.push(`added: ${JSON.stringify(m.added)}`);
                if (m.note) parts.push(`note: ${JSON.stringify(m.note)}`);
                if (m.link) parts.push(`link: ${JSON.stringify(m.link)}`);
                if (typeof m.done === "string") parts.push(`done: ${JSON.stringify(m.done)}`);
                return `    { ${parts.join(", ")} },`;
            })
            .join("\n");
    }

    CM.views.manifesting = {
        title: () => `Manifesting · ${CM.site.title}`,
        render(main) {
            let sort = CM.store.get("manifest:sort", "priority");

            main.innerHTML = `
            <section class="page-hero wrap">
                <p class="kicker mono">(02) The list</p>
                <h1 class="page-title"><span class="line"><span><em>Manifesting</em></span></span></h1>
                <p class="lede">Dishes I'm going to cook. Check one off and it's manifested.</p>
            </section>
            <section class="wrap m-wrap">
                <div class="list-bar">
                    <p class="list-count mono" aria-live="polite"></p>
                    <label class="select mono"><span class="sr">Sort</span>
                        <select id="m-sort">
                            <option value="priority">By priority</option>
                            <option value="newest">Newest first</option>
                            <option value="az">A to Z</option>
                        </select>
                    </label>
                    <button type="button" class="pill" id="m-copy" hidden>${CM.icon("copy")}<span>Copy as data</span></button>
                    <button type="button" class="pill pill--ink" id="m-add" aria-expanded="false" aria-controls="m-form">${CM.icon("plus")}<span>Add an idea</span></button>
                </div>
                <form class="add-form" id="m-form" hidden autocomplete="off">
                    <label class="field field--grow"><span class="mono">Dish</span><input name="title" required maxlength="120" placeholder="e.g. Hand-pulled noodles"></label>
                    <label class="field"><span class="mono">Priority</span>
                        <select name="priority">${PRIORITIES.map((p) => `<option value="${p}"${p === "medium" ? " selected" : ""}>${p[0].toUpperCase() + p.slice(1)}</option>`).join("")}</select>
                    </label>
                    <label class="field field--grow"><span class="mono">Note</span><input name="note" maxlength="280" placeholder="Where I had it, what to try"></label>
                    <label class="field field--grow"><span class="mono">Link</span><input name="link" type="url" inputmode="url" placeholder="https://"></label>
                    <div class="form-acts">
                        <button type="button" class="pill" data-cancel>Cancel</button>
                        <button type="submit" class="pill pill--accent">${CM.icon("plus")}<span>Add</span></button>
                    </div>
                    <p class="form-hint">Saved in this browser. Use <b>Copy as data</b> to paste it into <code>data/manifesting.js</code> and make it permanent.</p>
                </form>
                <ol class="checklist m-list" id="m-open"></ol>
                <p class="empty" id="m-empty" hidden>Nothing left to manifest. Add the next idea.</p>
                <h2 class="sub-title" id="m-done-title" hidden><em>Manifested</em> <sup class="mono"></sup></h2>
                <ol class="checklist m-list m-list--done" id="m-done"></ol>
            </section>`;

            const wrap = $(".m-wrap", main);
            const form = $("#m-form", main);
            const addBtn = $("#m-add", main);
            $("#m-sort", main).value = sort;

            function paint() {
                const items = CM.manifestingItems();
                const open = items.filter((m) => !m.done).sort(sorters[sort]);
                const done = items.filter((m) => m.done).sort((a, b) => String(b.done).localeCompare(String(a.done)));
                $("#m-open", main).innerHTML = open.map(rowHTML).join("");
                $("#m-done", main).innerHTML = done.map(rowHTML).join("");
                $("#m-empty", main).hidden = open.length > 0;
                $("#m-done-title", main).hidden = !done.length;
                $("#m-done-title sup", main).textContent = `(${pad(done.length)})`;
                $(".list-count", main).textContent = `${pad(open.length)} open · ${pad(done.length)} manifested`;
                $("#m-copy", main).hidden = !items.some((m) => m.local);
                CM.updateCounts();
            }

            CM.rowToggle(wrap);
            wrap.addEventListener("change", (e) => {
                const input = e.target.closest(".row-input");
                if (input) {
                    const row = input.closest(".row");
                    const done = CM.store.get("manifest:done", {});
                    if (input.checked) done[row.dataset.id] = today();
                    else delete done[row.dataset.id];
                    CM.store.set("manifest:done", done);
                    row.classList.toggle("is-done", input.checked);
                    if (input.checked) CM.toast("Manifested. " + CM.site.tagline + ".");
                    setTimeout(paint, CM.settings.reducedMotion() ? 0 : 650);
                    return;
                }
                if (e.target.id === "m-sort") {
                    sort = e.target.value;
                    CM.store.set("manifest:sort", sort);
                    paint();
                }
            });
            wrap.addEventListener("click", (e) => {
                const del = e.target.closest("[data-del]");
                if (del) {
                    const id = del.dataset.del;
                    const local = CM.store.get("manifest:local", []);
                    const item = local.find((m) => m.id === id);
                    CM.store.set("manifest:local", local.filter((m) => m.id !== id));
                    paint();
                    CM.toast(`Deleted "${item ? item.title : "idea"}"`, {
                        action: "Undo",
                        ms: 5000,
                        onAction: () => {
                            CM.store.set("manifest:local", CM.store.get("manifest:local", []).concat(item ? [item] : []));
                            paint();
                        },
                    });
                }
            });
            const toggleForm = (open) => {
                form.hidden = !open;
                addBtn.setAttribute("aria-expanded", open);
                if (open) form.elements.title.focus();
            };
            addBtn.addEventListener("click", () => toggleForm(form.hidden));
            $("[data-cancel]", form).addEventListener("click", () => toggleForm(false));
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                const f = form.elements;
                const title = f.title.value.trim();
                if (!title) return;
                const item = { id: "l:" + Date.now().toString(36), title, priority: f.priority.value, added: today() };
                if (f.note.value.trim()) item.note = f.note.value.trim();
                if (f.link.value.trim()) item.link = f.link.value.trim();
                CM.store.set("manifest:local", CM.store.get("manifest:local", []).concat([item]));
                form.reset();
                toggleForm(false);
                paint();
                CM.toast(`Added "${title}"`);
            });
            $("#m-copy", main).addEventListener("click", () => {
                const local = CM.manifestingItems().filter((m) => m.local);
                CM.copy(asData(local), `Copied ${local.length} idea${local.length > 1 ? "s" : ""}. Paste into data/manifesting.js`);
            });

            paint();
        },
    };
})(window.CM);
