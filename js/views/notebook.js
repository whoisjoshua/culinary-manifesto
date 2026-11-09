/*
 * Notebook: my own kitchen wishlist (tools, pantry) and notes.
 * Entries from data/notebook.js are the permanent record; anything added here is saved in this
 * browser until it's copied into the data file.
 */
(function (CM) {
    "use strict";
    const { esc, hash, pad, $, $$, fmtDate, today, debounce } = CM.util;
    const KINDS = { tool: "Tool", pantry: "Pantry", other: "Other" };

    const same = (s) => String(s || "").trim().toLowerCase();

    /* once something added here has been copied into data/notebook.js, drop the browser copy */
    function pruneLocal(key, data, sig) {
        const inData = new Set(data.map(sig));
        const list = CM.store.get(key, []);
        const kept = list.filter((x) => !inData.has(sig(x)));
        if (kept.length !== list.length) CM.store.set(key, kept);
        return kept;
    }
    const wishSig = (w) => same(w.item);
    const noteSig = (n) => same(n.title) + "\n" + same(n.body);
    const dataWish = () => (CM.notebook && CM.notebook.wishlist) || [];
    const dataNotes = () => (CM.notebook && CM.notebook.notes) || [];

    function wishItems() {
        const got = CM.store.get("wish:got", {});
        const fromData = dataWish().map((w) => Object.assign({}, w, { id: "s:" + hash(w.item), local: false, locked: !!w.got }));
        const local = pruneLocal("wish:local", dataWish(), wishSig).map((w) => Object.assign({}, w, { local: true }));
        return fromData.concat(local).map((w) => Object.assign(w, { got: (!w.local && w.got) || got[w.id] || false }));
    }
    const noteParas = (body) =>
        String(body || "")
            .split(/\n\s*\n/)
            .map((p) => `<p>${CM.rich(p.trim()).replace(/\n/g, "<br>")}</p>`)
            .join("");

    function wishRow(w) {
        const tid = "w-" + w.id.replace(/[^a-z0-9]/gi, "");
        return `
        <li class="row w-row${w.got ? " is-done" : ""}" data-id="${esc(w.id)}">
            <input type="checkbox" class="row-input" aria-labelledby="${tid}"${w.got ? " checked" : ""}${w.locked ? " disabled" : ""}>
            <span class="box" aria-hidden="true">${CM.CHECK_SVG}</span>
            <span class="row-body" id="${tid}">
                <span class="row-text">${CM.rich(w.item)}</span>
                ${w.note ? `<span class="row-note">${CM.rich(w.note)}</span>` : ""}
                ${w.local || w.got ? `<span class="m-meta mono">${[w.got ? "Got it " + fmtDate(w.got) : "", w.local ? "on this device" : ""].filter(Boolean).join(" · ")}</span>` : ""}
            </span>
            <span class="m-side">
                <span class="kind mono">${esc(KINDS[w.kind] || "Other")}</span>
                <span class="m-acts">
                    ${w.link ? `<a class="icon-btn sm" href="${esc(w.link)}" target="_blank" rel="noopener" aria-label="Open link" title="Open link">${CM.icon("link")}</a>` : ""}
                    ${w.local ? `<button type="button" class="icon-btn sm" data-del-wish="${esc(w.id)}" aria-label="Delete ${esc(w.item)}" title="Delete">${CM.icon("trash")}</button>` : ""}
                </span>
            </span>
        </li>`;
    }

    function noteCard(n) {
        if (!n.local) {
            return `<article class="note reveal">
                <header><h3 class="note-title">${esc(n.title || "Untitled")}</h3>${n.date ? `<time class="mono" datetime="${esc(n.date)}">${esc(fmtDate(n.date))}</time>` : ""}</header>
                <div class="note-body">${noteParas(n.body)}</div>
            </article>`;
        }
        return `<article class="note note--local" data-note="${esc(n.id)}">
            <header>
                <input class="note-title-in" value="${esc(n.title || "")}" placeholder="Untitled" aria-label="Note title" maxlength="120">
                <button type="button" class="icon-btn sm" data-del-note="${esc(n.id)}" aria-label="Delete note" title="Delete note">${CM.icon("trash")}</button>
            </header>
            <textarea class="note-body-in" rows="4" placeholder="Write anything…" aria-label="Note">${esc(n.body || "")}</textarea>
            <p class="m-meta mono">${esc(fmtDate(n.date))} · on this device · <span class="saved">saved</span></p>
        </article>`;
    }

    function asData(wish, notes) {
        const w = wish
            .map((x) => {
                const parts = [`item: ${JSON.stringify(x.item)}`, `kind: ${JSON.stringify(x.kind || "other")}`];
                if (x.note) parts.push(`note: ${JSON.stringify(x.note)}`);
                if (x.link) parts.push(`link: ${JSON.stringify(x.link)}`);
                if (typeof x.got === "string") parts.push(`got: ${JSON.stringify(x.got)}`);
                return `        { ${parts.join(", ")} },`;
            })
            .join("\n");
        const n = notes.map((x) => `        { title: ${JSON.stringify(x.title || "Untitled")}, date: ${JSON.stringify(x.date)}, body: ${JSON.stringify(x.body || "")} },`).join("\n");
        return [w && `    // wishlist:\n${w}`, n && `    // notes:\n${n}`].filter(Boolean).join("\n");
    }

    const autosize = (ta) => {
        ta.style.height = "auto";
        ta.style.height = ta.scrollHeight + 2 + "px";
    };

    CM.views.notebook = {
        title: () => `Notebook · ${CM.site.title}`,
        render(main) {
            main.innerHTML = `
            <section class="page-hero wrap">
                <p class="kicker mono">(03) For my own purposes</p>
                <h1 class="page-title"><span class="line"><span><em>Notebook</em></span></span></h1>
                <p class="lede">The kitchen wishlist and loose notes: tools to buy, things to find, ideas to remember.</p>
            </section>
            <section class="wrap nb-grid">
                <div class="nb-col">
                    <header class="col-head">
                        <h2 class="col-title mono">Kitchen wishlist <span id="w-count"></span></h2>
                        <button type="button" class="pill" id="nb-copy" hidden>${CM.icon("copy")}<span>Copy as data</span></button>
                    </header>
                    <form class="quick-add" id="w-form" autocomplete="off">
                        <input name="what" required maxlength="120" placeholder="Add to the wishlist…" aria-label="Wishlist item">
                        <select name="kind" aria-label="Kind">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>
                        <button type="submit" class="icon-btn" aria-label="Add">${CM.icon("plus")}</button>
                        <input name="note" class="qa-note" maxlength="200" placeholder="Note or link (optional)" aria-label="Note or link">
                    </form>
                    <div class="w-filter chips" role="group" aria-label="Show">
                        <button type="button" class="chip-f is-on" data-f="">All</button>
                        ${Object.entries(KINDS).map(([k, l]) => `<button type="button" class="chip-f" data-f="${k}">${l}</button>`).join("")}
                    </div>
                    <ul class="checklist w-list" id="w-list"></ul>
                    <p class="empty" id="w-empty" hidden>The wishlist is empty. A carbon steel wok, maybe?</p>
                </div>
                <div class="nb-col">
                    <header class="col-head">
                        <h2 class="col-title mono">Notes <span id="n-count"></span></h2>
                        <button type="button" class="pill pill--ink" id="n-new">${CM.icon("plus")}<span>New note</span></button>
                    </header>
                    <div class="notes" id="notes"></div>
                    <p class="empty" id="n-empty" hidden>No notes yet.</p>
                </div>
            </section>`;

            let filter = "";
            const grid = $(".nb-grid", main);

            function paintWish() {
                const items = wishItems();
                const shown = items.filter((w) => !filter || (w.kind || "other") === filter).sort((a, b) => (a.got ? 1 : 0) - (b.got ? 1 : 0));
                $("#w-list", main).innerHTML = shown.map(wishRow).join("");
                $("#w-empty", main).hidden = shown.length > 0;
                $("#w-count", main).textContent = `(${pad(items.filter((w) => !w.got).length)})`;
                paintCopy();
            }
            function paintNotes() {
                const fromData = dataNotes().map((n) => Object.assign({}, n, { local: false }));
                const local = pruneLocal("notes:local", dataNotes(), noteSig).map((n) => Object.assign({}, n, { local: true }));
                const all = local.slice().reverse().concat(fromData.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))));
                $("#notes", main).innerHTML = all.map(noteCard).join("");
                $("#n-empty", main).hidden = all.length > 0;
                $("#n-count", main).textContent = `(${pad(all.length)})`;
                $$(".note-body-in", main).forEach(autosize);
                CM.observeReveals(main);
                paintCopy();
            }
            function paintCopy() {
                $("#nb-copy", main).hidden = !(CM.store.get("wish:local", []).length || CM.store.get("notes:local", []).length);
            }

            CM.rowToggle($("#w-list", main));
            grid.addEventListener("change", (e) => {
                const input = e.target.closest(".row-input");
                if (!input) return;
                const row = input.closest(".row");
                const got = CM.store.get("wish:got", {});
                if (input.checked) got[row.dataset.id] = today();
                else delete got[row.dataset.id];
                CM.store.set("wish:got", got);
                row.classList.toggle("is-done", input.checked);
                setTimeout(paintWish, CM.settings.reducedMotion() ? 0 : 600);
            });

            $("#w-form", main).addEventListener("submit", (e) => {
                e.preventDefault();
                const f = e.target.elements;
                const item = f.what.value.trim();
                if (!item) return;
                const extra = f.note.value.trim();
                const w = { id: "l:" + Date.now().toString(36), item, kind: f.kind.value, added: today() };
                if (/^https?:\/\//i.test(extra)) w.link = extra;
                else if (extra) w.note = extra;
                CM.store.set("wish:local", CM.store.get("wish:local", []).concat([w]));
                f.what.value = "";
                f.note.value = "";
                f.what.focus();
                paintWish();
            });
            $(".w-filter", main).addEventListener("click", (e) => {
                const b = e.target.closest(".chip-f");
                if (!b) return;
                filter = b.dataset.f;
                $$(".w-filter .chip-f", main).forEach((x) => x.classList.toggle("is-on", x === b));
                paintWish();
            });

            grid.addEventListener("click", (e) => {
                const dw = e.target.closest("[data-del-wish]");
                if (dw) {
                    const list = CM.store.get("wish:local", []);
                    const item = list.find((w) => w.id === dw.dataset.delWish);
                    CM.store.set("wish:local", list.filter((w) => w !== item));
                    paintWish();
                    CM.toast(`Deleted "${item ? item.item : "item"}"`, {
                        action: "Undo",
                        ms: 5000,
                        onAction: () => {
                            CM.store.set("wish:local", CM.store.get("wish:local", []).concat(item ? [item] : []));
                            paintWish();
                        },
                    });
                }
                const dn = e.target.closest("[data-del-note]");
                if (dn) {
                    const list = CM.store.get("notes:local", []);
                    const note = list.find((n) => n.id === dn.dataset.delNote);
                    CM.store.set("notes:local", list.filter((n) => n !== note));
                    paintNotes();
                    CM.toast("Note deleted", {
                        action: "Undo",
                        ms: 5000,
                        onAction: () => {
                            CM.store.set("notes:local", CM.store.get("notes:local", []).concat(note ? [note] : []));
                            paintNotes();
                        },
                    });
                }
            });

            $("#n-new", main).addEventListener("click", () => {
                const n = { id: "l:" + Date.now().toString(36), title: "", body: "", date: today() };
                CM.store.set("notes:local", CM.store.get("notes:local", []).concat([n]));
                paintNotes();
                const card = $(`[data-note="${n.id}"] .note-title-in`, main);
                if (card) card.focus();
            });

            const saveNote = debounce((card) => {
                const list = CM.store.get("notes:local", []);
                const n = list.find((x) => x.id === card.dataset.note);
                if (!n) return;
                n.title = $(".note-title-in", card).value;
                n.body = $(".note-body-in", card).value;
                CM.store.set("notes:local", list);
                const s = $(".saved", card);
                if (s) {
                    s.textContent = "saved";
                    s.classList.add("is-flash");
                    setTimeout(() => s.classList.remove("is-flash"), 600);
                }
                paintCopy();
            }, 350);
            $("#notes", main).addEventListener("input", (e) => {
                const card = e.target.closest(".note--local");
                if (!card) return;
                if (e.target.classList.contains("note-body-in")) autosize(e.target);
                const s = $(".saved", card);
                if (s) s.textContent = "saving…";
                saveNote(card);
            });

            $("#nb-copy", main).addEventListener("click", () => {
                const wish = wishItems().filter((w) => w.local);
                const notes = CM.store.get("notes:local", []).filter((n) => n.title || n.body);
                CM.copy(asData(wish, notes), "Copied. Paste into data/notebook.js");
            });

            paintWish();
            paintNotes();
        },
    };
})(window.CM);
