/*
 * Recipe page: checkable ingredients and steps (saved per browser), a batch scaler, unit conversion,
 * tap-to-start timers, cook mode (keeps the screen awake and follows the current step), share and print.
 */
(function (CM) {
    "use strict";
    const { esc, hash, pad, $, $$, isCJK } = CM.util;
    const MULTS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
    const CHECK_SVG = CM.CHECK_SVG;

    const textOf = (it) => (typeof it === "string" ? it : it.text || "");
    const ids = (r) =>
        r.sections.map((s, si) => {
            const seen = {};
            return s.items.map((it) => {
                const base = si + "." + hash(s.title + "|" + textOf(it));
                seen[base] = (seen[base] || 0) + 1;
                return seen[base] > 1 ? base + "." + seen[base] : base;
            });
        });

    CM.views.recipe = {
        title: (p) => {
            const r = CM.recipes.find((x) => x.slug === p.slug);
            return r ? `${r.title}${r.en ? " · " + r.en : ""} · ${CM.site.title}` : CM.site.title;
        },
        render(main, params) {
            const idx = CM.recipes.findIndex((x) => x.slug === params.slug);
            if (idx < 0) {
                main.innerHTML = `<section class="page-hero wrap"><p class="kicker mono">(404)</p><h1 class="page-title"><em>Not in the book</em></h1>
                    <p class="lede">That recipe isn't here, or it moved. <a class="text-link" href="#/cookbook">Back to the cookbook ${CM.icon("arrowR")}</a></p></section>`;
                return;
            }
            const r = CM.recipes[idx];
            const itemIds = ids(r);
            const checkKey = "checks:" + r.slug;
            const scaleKey = "scale:" + r.slug;
            const validIds = new Set(itemIds.flat());
            let checks = new Set(CM.store.get(checkKey, []).filter((id) => validIds.has(id)));
            let scale = +CM.store.get(scaleKey, r.serves || 1) || 1; // servings count when r.serves is set, else a multiplier
            let cooking = false;
            let wakeLock = null;

            const allItems = r.sections.flatMap((s) => s.items);
            const hasAmounts = allItems.some((it) => CM.qty.parse(textOf(it)));
            const hasUnits =
                allItems.some((it) => {
                    const q = CM.qty.parse(textOf(it));
                    return q && q.unit && ["vol", "mass"].includes(CM.qty.UNITS[q.unit].kind);
                }) || allItems.some((it) => CM.qty.findTemps(textOf(it)).length);
            const factor = () => (r.serves ? scale / r.serves : scale);
            const toCheck = allItems.filter((it) => it && it.check).length;
            const ingSections = r.sections.map((s, si) => [s, si]).filter(([s]) => s.kind === "ingredients");
            const stepSections = r.sections.map((s, si) => [s, si]).filter(([s]) => s.kind === "steps");
            const zh = isCJK(r.title);
            const prev = CM.recipes[(idx - 1 + CM.recipes.length) % CM.recipes.length];
            const next = CM.recipes[(idx + 1) % CM.recipes.length];

            function scaleLabel() {
                if (r.serves) return `${scale} serving${scale === 1 ? "" : "s"}`;
                return CM.qty.fmtFrac(scale) + "×";
            }

            function ingRow(it, id) {
                const o = typeof it === "string" ? { text: it } : it;
                const q = CM.qty.parse(o.text);
                const gloss = !o.en;
                let body;
                if (q) {
                    const shown = CM.qty.format(q, factor(), CM.settings.get("units"));
                    const changed = shown !== q.src;
                    body = `<b class="qty${changed ? " is-changed" : ""}"${changed ? ` title="Written as ${esc(q.src)}"` : ""}>${esc(shown)}</b> ${CM.rich(q.rest, { gloss })}`;
                } else body = CM.rich(o.text, { gloss });
                const tid = "t-" + id.replace(/\./g, "-");
                const done = checks.has(id);
                return `
                <li class="row${done ? " is-done" : ""}" data-id="${esc(id)}">
                    <input type="checkbox" class="row-input" aria-labelledby="${tid}"${done ? " checked" : ""}>
                    <span class="box" aria-hidden="true">${CHECK_SVG}</span>
                    <span class="row-body" id="${tid}">
                        <span class="row-text"${isCJK(o.text) && !q ? ' lang="zh"' : ""}>${body}</span>
                        ${o.en ? `<span class="row-en">${esc(o.en)}</span>` : ""}
                        ${o.note ? `<span class="row-note">${CM.rich(o.note, { gloss: true })}</span>` : ""}
                    </span>
                    ${o.check ? '<span class="flag mono" title="Amount not confirmed yet">Check</span>' : ""}
                </li>`;
            }

            function stepRow(it, id, n) {
                const o = typeof it === "string" ? { text: it } : it;
                const tid = "t-" + id.replace(/\./g, "-");
                const done = checks.has(id);
                return `
                <li class="row row--step${done ? " is-done" : ""}" data-id="${esc(id)}">
                    <input type="checkbox" class="row-input" aria-labelledby="${tid}"${done ? " checked" : ""}>
                    <span class="step-n" aria-hidden="true"><span class="n">${pad(n)}</span>${CHECK_SVG}</span>
                    <span class="row-body" id="${tid}">
                        <span class="row-text">${CM.rich(o.text, { chips: true })}</span>
                        ${o.note ? `<span class="row-note">${CM.rich(o.note, { chips: true })}</span>` : ""}
                    </span>
                </li>`;
            }

            function ingredientsHTML() {
                if (!ingSections.length) return "";
                return ingSections
                    .map(
                        ([s, si]) => `
                    <div class="r-sec" data-sec="${si}">
                        <h3 class="r-sec-title"><span>${esc(s.title || "Ingredients")}</span>${s.zh ? `<span class="zh" lang="zh">${esc(s.zh)}</span>` : ""}<span class="sec-count mono"></span></h3>
                        <ul class="checklist">${s.items.map((it, ii) => ingRow(it, itemIds[si][ii])).join("")}</ul>
                    </div>`
                    )
                    .join("");
            }

            function stepsHTML() {
                if (!stepSections.length) {
                    return `<div class="draft-card"><p class="mono">Method</p><p>Still being written. The ingredients are here, the steps are coming.</p></div>`;
                }
                let n = 0;
                return stepSections
                    .map(
                        ([s, si]) => `
                    <div class="r-sec" data-sec="${si}">
                        ${stepSections.length > 1 || (s.title && s.title !== "Steps") ? `<h3 class="r-sec-title"><span>${esc(s.title)}</span><span class="sec-count mono"></span></h3>` : ""}
                        <ol class="checklist steps">${s.items.map((it, ii) => stepRow(it, itemIds[si][ii], ++n)).join("")}</ol>
                    </div>`
                    )
                    .join("");
            }

            const meta = [
                r.time ? `<span class="tag">${CM.icon("timer")}${esc(r.time)}</span>` : "",
                r.serves ? `<span class="tag">Serves ${esc(r.serves)}</span>` : "",
                ...(r.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`),
                r.status === "draft" ? '<span class="tag tag--draft">Draft</span>' : "",
                toCheck ? `<span class="tag tag--warn">${toCheck} amount${toCheck > 1 ? "s" : ""} to double-check</span>` : "",
            ].join("");

            main.innerHTML = `
            <article class="recipe" style="--h:${r.hue != null ? +r.hue : 32}">
                <header class="r-head wrap">
                    <a class="crumb mono" href="#/cookbook">${CM.icon("arrowL")} Cookbook</a>
                    <div class="r-head-grid">
                        <div class="r-head-text">
                            <p class="kicker mono">No. ${pad(idx + 1)}${r.category ? " · " + esc(r.category) : ""}</p>
                            <h1 class="r-h1${zh ? " zh" : ""}"${zh ? ' lang="zh"' : ""}><span class="line"><span>${esc(r.title)}</span></span></h1>
                            ${r.py ? `<p class="r-py mono">${esc(r.py)}</p>` : ""}
                            ${r.en ? `<p class="r-en">${esc(r.en)}</p>` : ""}
                            ${meta ? `<div class="r-meta">${meta}</div>` : ""}
                            ${r.intro ? `<p class="r-intro">${esc(r.intro)}</p>` : ""}
                        </div>
                        <div class="r-head-plate">${CM.plate(r, "plate--hero")}</div>
                    </div>
                </header>

                <div class="r-bar" role="toolbar" aria-label="Recipe tools">
                    <div class="r-bar-in wrap">
                        ${
                            hasAmounts
                                ? `<div class="ctl ctl-scale" role="group" aria-label="${r.serves ? "Servings" : "Batch size"}">
                            <button type="button" class="icon-btn sm" data-scale="-1" aria-label="Smaller">${CM.icon("minus")}</button>
                            <output class="scale-val mono" aria-live="polite">${esc(scaleLabel())}</output>
                            <button type="button" class="icon-btn sm" data-scale="1" aria-label="Bigger">${CM.icon("plus")}</button>
                        </div>`
                                : ""
                        }
                        ${
                            hasUnits
                                ? `<div class="seg" role="radiogroup" aria-label="Units">
                            ${[["original", "Original", "Orig."], ["metric", "Metric", "Metric"], ["us", "US", "US"]]
                                .map(
                                    ([v, l, short]) =>
                                        `<button type="button" role="radio" data-units="${v}" aria-label="${l}" aria-checked="${CM.settings.get("units") === v}"><span class="hide-sm">${l}</span><span class="show-sm" aria-hidden="true">${short}</span></button>`
                                )
                                .join("")}
                        </div>`
                                : ""
                        }
                        <span class="bar-sp"></span>
                        <span class="prog-label mono" aria-live="polite"></span>
                        <button type="button" class="pill pill--cook" data-act="cook" aria-pressed="false" aria-label="Cook mode">${CM.icon("flame")}<span class="cook-l">Cook mode</span></button>
                        <button type="button" class="icon-btn" data-act="reset" aria-label="Uncheck everything" title="Uncheck everything">${CM.icon("reset")}</button>
                        <button type="button" class="icon-btn hide-sm" data-act="share" aria-label="Share" title="Share">${CM.icon("share")}</button>
                        <button type="button" class="icon-btn hide-sm" data-act="print" aria-label="Print" title="Print">${CM.icon("print")}</button>
                    </div>
                    <div class="r-prog" aria-hidden="true"><span></span></div>
                </div>

                <div class="r-body wrap">
                    ${
                        ingSections.length
                            ? `<section class="r-col r-col--ing" aria-labelledby="h-ing">
                        <h2 class="col-title mono" id="h-ing">Ingredients</h2>
                        <div class="ing-lists">${ingredientsHTML()}</div>
                    </section>`
                            : ""
                    }
                    <section class="r-col r-col--steps" aria-labelledby="h-steps">
                        <h2 class="col-title mono" id="h-steps">Method</h2>
                        <div class="step-lists">${stepsHTML()}</div>
                        ${
                            r.notes && r.notes.length
                                ? `<div class="r-notes"><h3 class="mono">Notes</h3>${r.notes.map((n) => `<p>${CM.rich(n, { chips: true })}</p>`).join("")}</div>`
                                : ""
                        }
                    </section>
                </div>

                ${
                    CM.recipes.length > 1
                        ? `<nav class="r-pn wrap" aria-label="More recipes">
                    <a class="pn" href="#/r/${esc(prev.slug)}"><span class="mono">${CM.icon("arrowL")} Previous</span><span class="pn-title${isCJK(prev.title) ? " zh" : ""}">${esc(prev.title)}</span></a>
                    <a class="pn pn--next" href="#/r/${esc(next.slug)}"><span class="mono">Next ${CM.icon("arrowR")}</span><span class="pn-title${isCJK(next.title) ? " zh" : ""}">${esc(next.title)}</span></a>
                </nav>`
                        : ""
                }
            </article>`;

            const art = $(".recipe", main);
            const body = $(".r-body", art);
            const total = validIds.size;

            function progress(announce) {
                const done = checks.size;
                const p = total ? done / total : 0;
                $(".r-prog span", art).style.transform = `scaleX(${p})`;
                $(".prog-label", art).textContent = `${done}/${total}`;
                $$(".r-sec", art).forEach((sec) => {
                    const rows = $$(".row", sec);
                    const c = $(".sec-count", sec);
                    if (c) c.textContent = `${rows.filter((x) => x.classList.contains("is-done")).length}/${rows.length}`;
                });
                const steps = $$(".row--step", art);
                const firstOpen = steps.find((s) => !s.classList.contains("is-done"));
                steps.forEach((s) => s.classList.toggle("is-current", s === firstOpen));
                if (announce && steps.length && !firstOpen) CM.toast("Plated. " + CM.site.tagline + ".", { ms: 3500 });
                return firstOpen;
            }

            function paintLists() {
                const ing = $(".ing-lists", art);
                if (ing) ing.innerHTML = ingredientsHTML();
                $(".step-lists", art).innerHTML = stepsHTML();
                progress(false);
            }

            /* checking rows */
            CM.rowToggle(body);
            body.addEventListener("change", (e) => {
                const input = e.target.closest(".row-input");
                if (!input) return;
                const row = input.closest(".row");
                const id = row.dataset.id;
                const wasStepsDone = $$(".row--step", art).length && $$(".row--step", art).every((s) => s.classList.contains("is-done"));
                if (input.checked) checks.add(id);
                else checks.delete(id);
                row.classList.toggle("is-done", input.checked);
                CM.store.set(checkKey, Array.from(checks));
                const current = progress(!wasStepsDone && row.classList.contains("row--step"));
                if (cooking && current && input.checked && row.classList.contains("row--step")) {
                    current.scrollIntoView({ behavior: CM.settings.reducedMotion() ? "auto" : "smooth", block: "center" });
                }
            });

            /* timers inside steps */
            body.addEventListener("click", (e) => {
                const chip = e.target.closest(".chip--time");
                if (!chip) return;
                const row = chip.closest(".row--step");
                const n = row ? $(".n", row).textContent : "";
                CM.timers.start(+chip.dataset.min, `${r.title}${n ? " · step " + +n : ""}`);
            });

            /* toolbar */
            const bar = $(".r-bar", art);
            bar.addEventListener("click", async (e) => {
                const b = e.target.closest("button");
                if (!b) return;
                if (b.dataset.scale) {
                    const dir = +b.dataset.scale;
                    if (r.serves) scale = Math.max(1, Math.min(99, scale + dir));
                    else {
                        const i = MULTS.indexOf(scale);
                        if (i >= 0) scale = MULTS[Math.max(0, Math.min(MULTS.length - 1, i + dir))];
                        else if (dir > 0) scale = MULTS.find((m) => m > scale) || MULTS[MULTS.length - 1];
                        else scale = MULTS.slice().reverse().find((m) => m < scale) || MULTS[0];
                    }
                    CM.store.set(scaleKey, scale);
                    $(".scale-val", bar).textContent = scaleLabel();
                    paintLists();
                } else if (b.dataset.units) {
                    CM.settings.set("units", b.dataset.units);
                } else if (b.dataset.act === "cook") {
                    setCooking(!cooking);
                } else if (b.dataset.act === "reset") {
                    if (!checks.size) return CM.toast("Nothing checked yet");
                    const before = Array.from(checks);
                    checks = new Set();
                    CM.store.set(checkKey, []);
                    paintLists();
                    CM.toast("Unchecked everything", {
                        action: "Undo",
                        ms: 5000,
                        onAction: () => {
                            checks = new Set(before);
                            CM.store.set(checkKey, before);
                            paintLists();
                        },
                    });
                } else if (b.dataset.act === "share") {
                    const data = { title: `${r.title} · ${CM.site.title}`, url: location.href };
                    if (navigator.share) {
                        try {
                            await navigator.share(data);
                        } catch (err) {}
                    } else CM.copy(location.href, "Link copied");
                } else if (b.dataset.act === "print") {
                    window.print();
                }
            });

            /* cook mode: bigger type, follow the current step, keep the screen on */
            async function lock() {
                if (!cooking || !CM.settings.get("wake") || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
                try {
                    wakeLock = await navigator.wakeLock.request("screen");
                    wakeLock.addEventListener && wakeLock.addEventListener("release", () => (wakeLock = null));
                } catch (e) {
                    wakeLock = null;
                }
            }
            function unlock() {
                if (wakeLock) wakeLock.release().catch(() => {});
                wakeLock = null;
            }
            function setCooking(on) {
                cooking = on;
                art.classList.toggle("is-cooking", on);
                document.body.classList.toggle("cooking", on);
                const b = $('[data-act="cook"]', bar);
                b.setAttribute("aria-pressed", on);
                $(".cook-l", b).textContent = on ? "Cooking" : "Cook mode";
                if (on) {
                    lock();
                    const awake = CM.settings.get("wake") && "wakeLock" in navigator;
                    CM.toast(awake ? "Cook mode on. The screen stays awake." : "Cook mode on");
                    const current = $(".row--step.is-current", art) || $(".r-body", art);
                    current.scrollIntoView({ behavior: CM.settings.reducedMotion() ? "auto" : "smooth", block: "center" });
                } else unlock();
            }
            const onVis = () => document.visibilityState === "visible" && lock();
            document.addEventListener("visibilitychange", onVis);

            const off = CM.settings.on((k) => {
                if (k === "units" || k === "gloss" || k === "*") {
                    $$("[data-units]", bar).forEach((x) => x.setAttribute("aria-checked", x.dataset.units === CM.settings.get("units")));
                    paintLists();
                }
                if (k === "wake") cooking && (CM.settings.get("wake") ? lock() : unlock());
            });

            /* the bar gets a shadow once it's stuck under the header */
            const sentinel = document.createElement("div");
            sentinel.className = "bar-sentinel";
            bar.before(sentinel);
            const io = new IntersectionObserver(([en]) => bar.classList.toggle("is-stuck", !en.isIntersecting), {
                rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) + 1 || 65}px 0px 0px 0px`,
            });
            io.observe(sentinel);

            progress(false);

            return () => {
                off();
                io.disconnect();
                document.removeEventListener("visibilitychange", onVis);
                unlock();
                document.body.classList.remove("cooking");
            };
        },
    };
})(window.CM);
