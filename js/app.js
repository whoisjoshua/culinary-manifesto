/*
 * App shell: hash router (#/, #/cookbook, #/r/<slug>, #/manifesting, #/notebook, #/tools), page transitions,
 * scroll reveals, header state, settings sheet, backup import/export and the footer.
 */
(function (CM) {
    "use strict";
    const { esc, $, $$, today } = CM.util;
    const VERSION = "1.0";
    const main = $("#view");
    let cleanup = null;
    let first = true;
    const stack = [];
    const positions = {};

    /* ---------- reveals ---------- */
    let io = null;
    CM.observeReveals = (root) => {
        const els = $$(".reveal:not(.is-in)", root || document);
        if (CM.settings.reducedMotion() || !("IntersectionObserver" in window)) return els.forEach((el) => el.classList.add("is-in"));
        io =
            io ||
            new IntersectionObserver(
                (entries) =>
                    entries.forEach((en) => {
                        if (!en.isIntersecting) return;
                        en.target.classList.add("is-in");
                        io.unobserve(en.target);
                    }),
                { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
            );
        els.forEach((el) => io.observe(el));
    };

    /* ---------- counts in the nav ---------- */
    CM.updateCounts = () => {
        const open = CM.manifestingItems().filter((m) => !m.done).length;
        $$('[data-count="manifesting"]').forEach((el) => (el.textContent = open ? String(open) : ""));
    };

    /* ---------- router ---------- */
    function parse() {
        const h = decodeURIComponent(location.hash.replace(/^#/, ""));
        if (h.startsWith("/r/")) return { name: "recipe", params: { slug: h.slice(3) }, nav: "cookbook" };
        const page = h.replace(/^\//, "");
        if (["cookbook", "manifesting", "notebook", "tools"].includes(page)) return { name: page, params: {}, nav: page };
        if (h === "index") return { name: "cookbook", params: {}, nav: "cookbook" }; // old link to the list on the home page
        // home is the landing page, so nothing in the nav is selected
        return { name: "home", params: {}, nav: null, anchor: h && !h.startsWith("/") ? h : null };
    }

    function render() {
        const r = parse();
        const view = CM.views[r.name];
        const key = location.hash || "#/";
        const back = stack.length > 1 && stack[stack.length - 2] === key;
        if (back) stack.pop();
        else if (stack[stack.length - 1] !== key) stack.push(key);

        const swap = () => {
            if (cleanup) cleanup();
            cleanup = null;
            CM.closeGloss();
            main.innerHTML = "";
            cleanup = view.render(main, r.params) || null;
            document.title = view.title(r.params);
            $$("[data-nav]").forEach((a) => {
                const on = a.dataset.nav === r.nav;
                a.classList.toggle("is-active", on);
                if (on) a.setAttribute("aria-current", "page");
                else a.removeAttribute("aria-current");
            });
            CM.observeReveals(main);
            if (r.anchor && document.getElementById(r.anchor)) document.getElementById(r.anchor).scrollIntoView();
            else window.scrollTo(0, back && positions[key] != null ? positions[key] : 0);
            if (!first) main.focus({ preventScroll: true });
        };

        const animate = !first && !CM.settings.reducedMotion();
        if (animate && document.startViewTransition) document.startViewTransition(swap);
        else {
            swap();
            if (animate) {
                main.classList.remove("page-in");
                void main.offsetWidth;
                main.classList.add("page-in");
            }
        }
        first = false;
    }

    window.addEventListener("hashchange", render);
    // remember where you were on each page, so Back lands in the same spot
    window.addEventListener("scroll", () => (positions[location.hash || "#/"] = window.scrollY), { passive: true });
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    // in-page anchors (#index) scroll instead of routing
    document.addEventListener("click", (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const href = a.getAttribute("href");
        const here = (location.hash || "#/") === href || (href === "#/" && !location.hash);
        if (here && href.startsWith("#/")) {
            // tapping the page you're already on (logo, tab) scrolls back to the top
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: CM.settings.reducedMotion() ? "auto" : "smooth" });
            return;
        }
        if (href.startsWith("#/") || href === "#") return;
        const el = document.getElementById(href.slice(1));
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: CM.settings.reducedMotion() ? "auto" : "smooth" });
        if (el.tabIndex < 0 && !/^(a|button|input)$/i.test(el.tagName)) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
    });

    /* ---------- header ---------- */
    const hdr = $("#hdr");
    const onScroll = () => hdr.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });

    const THEMES = [
        ["auto", "Auto", "auto"],
        ["light", "Light", "sun"],
        ["dark", "Dark", "moon"],
        ["night", "Night", "night"],
    ];
    function paintThemeBtn() {
        const t = CM.settings.get("theme");
        const th = THEMES.find((x) => x[0] === t) || THEMES[0];
        const b = $("#theme-btn");
        b.innerHTML = CM.icon(th[2]);
        b.setAttribute("aria-label", `Theme: ${th[1]}. Change theme`);
        b.title = `Theme: ${th[1]}`;
    }
    $("#theme-btn").addEventListener("click", () => {
        const i = THEMES.findIndex((x) => x[0] === CM.settings.get("theme"));
        const next = THEMES[(i + 1) % THEMES.length];
        CM.settings.set("theme", next[0]);
        CM.toast(`Theme: ${next[1]}${next[0] === "night" ? " (warm and dim)" : next[0] === "auto" ? " (follows your device)" : ""}`);
    });

    /* ---------- settings sheet ---------- */
    const SEGS = {
        theme: THEMES.map(([v, l]) => [v, l]),
        text: [["s", "Small"], ["m", "Default"], ["l", "Large"]],
        motion: [["auto", "Auto"], ["full", "Full"], ["reduced", "Reduced"]],
        units: [["original", "Original"], ["metric", "Metric"], ["us", "US"]],
        gloss: [["tap", "Tap to translate"], ["inline", "Show English"]],
    };
    const seg = (k) =>
        `<div class="seg seg--wide" role="radiogroup" aria-label="${k}" data-set="${k}">${SEGS[k]
            .map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-checked="${CM.settings.get(k) === v}">${esc(l)}</button>`)
            .join("")}</div>`;

    function buildSettings() {
        const d = $("#settings");
        d.innerHTML = `
        <div class="sheet-in">
            <header class="sheet-head">
                <h2 id="set-title">Settings</h2>
                <button type="button" class="icon-btn" data-close aria-label="Close settings">${CM.icon("x")}</button>
            </header>
            <section class="set-sec">
                <h3 class="mono">Appearance</h3>
                <div class="set-row"><span class="set-l">Theme</span>${seg("theme")}</div>
                <p class="set-hint">Auto follows your device. Night is a warm, dim palette for late cooking.</p>
                <div class="set-row"><span class="set-l">Text size</span>${seg("text")}</div>
                <div class="set-row"><span class="set-l">Motion</span>${seg("motion")}</div>
            </section>
            <section class="set-sec">
                <h3 class="mono">Recipes</h3>
                <div class="set-row"><span class="set-l">Units</span>${seg("units")}</div>
                <p class="set-hint">Metric turns cups and spoons into ml, sticks into grams, °F into °C. US goes the other way.</p>
                <div class="set-row"><span class="set-l">Chinese terms</span>${seg("gloss")}</div>
                <label class="set-row switch"><span class="set-l">Keep the screen awake in cook mode</span><input type="checkbox" role="switch" data-bool="wake"${CM.settings.get("wake") ? " checked" : ""}></label>
                <label class="set-row switch"><span class="set-l">Timer chime</span><input type="checkbox" role="switch" data-bool="sound"${CM.settings.get("sound") ? " checked" : ""}></label>
            </section>
            <section class="set-sec">
                <h3 class="mono">Your data</h3>
                <p class="set-hint">Checkmarks, ideas, notes and settings are saved in this browser only. Back them up to move them to another device.</p>
                <div class="set-btns">
                    <button type="button" class="pill" data-data="export">${CM.icon("download")}<span>Export backup</span></button>
                    <button type="button" class="pill" data-data="import">${CM.icon("upload")}<span>Import backup</span></button>
                    <button type="button" class="pill" data-data="checks">${CM.icon("reset")}<span>Uncheck all recipes</span></button>
                    <button type="button" class="pill pill--danger" data-data="clear">${CM.icon("trash")}<span>Clear everything</span></button>
                </div>
                <input type="file" id="import-file" accept="application/json,.json" hidden>
            </section>
            <footer class="sheet-foot mono">${esc(CM.site.title)} · v${VERSION}</footer>
        </div>`;
    }

    function openSettings() {
        const d = $("#settings");
        buildSettings();
        if (d.showModal) d.showModal();
        else d.setAttribute("open", "");
        const inner = $(".sheet-in", d);
        inner.setAttribute("tabindex", "-1");
        inner.focus({ preventScroll: true });
        document.documentElement.classList.add("sheet-open");
    }
    function closeSettings() {
        const d = $("#settings");
        d.classList.add("is-closing");
        setTimeout(
            () => {
                d.classList.remove("is-closing");
                if (d.close) d.close();
                else d.removeAttribute("open");
                document.documentElement.classList.remove("sheet-open");
            },
            CM.settings.reducedMotion() ? 0 : 220
        );
    }
    $("#settings-btn").addEventListener("click", openSettings);
    $("#settings").addEventListener("cancel", (e) => {
        e.preventDefault();
        closeSettings();
    });
    $("#settings").addEventListener("click", async (e) => {
        const d = $("#settings");
        if (e.target === d || e.target.closest("[data-close]")) return closeSettings();
        const opt = e.target.closest("[data-set] [data-v]");
        if (opt) {
            const k = opt.closest("[data-set]").dataset.set;
            CM.settings.set(k, opt.dataset.v);
            $$(`[data-set="${k}"] [data-v]`, d).forEach((b) => b.setAttribute("aria-checked", b === opt));
            return;
        }
        const act = e.target.closest("[data-data]");
        if (!act) return;
        const what = act.dataset.data;
        if (what === "export") exportBackup();
        else if (what === "import") $("#import-file").click();
        else if (what === "checks") {
            CM.store.keys("checks:").forEach((k) => CM.store.remove(k));
            CM.toast("Unchecked every recipe");
            render();
        } else if (what === "clear") {
            if (!window.confirm("Clear every checkmark, idea, note, timer and setting saved in this browser? This can't be undone.")) return;
            CM.store.keys("").forEach((k) => CM.store.remove(k));
            CM.settings.reset();
            closeSettings();
            CM.toast("Cleared. Fresh start.");
            setTimeout(() => location.reload(), 600);
        }
    });
    $("#settings").addEventListener("change", (e) => {
        if (e.target.id === "import-file") return importBackup(e.target);
        const b = e.target.closest("[data-bool]");
        if (b) CM.settings.set(b.dataset.bool, b.checked);
    });

    function exportBackup() {
        const data = {};
        CM.store.keys("").forEach((k) => (data[k] = CM.store.get(k)));
        const blob = new Blob([JSON.stringify({ app: "culinary-manifesto", version: 1, exported: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `culinary-manifesto-backup-${today()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        CM.toast("Backup downloaded");
    }
    function importBackup(input) {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result);
                if (!json || json.app !== "culinary-manifesto" || typeof json.data !== "object") throw new Error("not a backup");
                Object.entries(json.data).forEach(([k, v]) => CM.store.set(k, v));
                CM.toast("Backup restored");
                setTimeout(() => location.reload(), 600);
            } catch (err) {
                CM.toast("That file isn't a Culinary Manifesto backup");
            }
            input.value = "";
        };
        reader.readAsText(file);
    }

    CM.settings.on((k) => {
        if (k === "theme" || k === "*") paintThemeBtn();
        if (k === "*") render();
        if (k === "motion") CM.observeReveals(main);
    });

    /* ---------- footer ---------- */
    function footer() {
        const s = CM.site;
        $("#footer").innerHTML = `
        <div class="ftr-in wrap">
            <a class="ftr-big" href="#/" aria-label="${esc(s.title)} home">${CM.mark("ftr-mark")}<em>${esc(s.tagline)}.</em></a>
            <div class="ftr-grid">
                <nav aria-label="Footer">
                    <p class="mono">Pages</p>
                    <a href="#/">Home</a><a href="#/cookbook">Cookbook</a><a href="#/manifesting">Manifesting</a><a href="#/notebook">Notebook</a><a href="#/tools">Tools</a>
                </nav>
                <div>
                    <p class="mono">Elsewhere</p>
                    ${s.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ${CM.icon("arrowUR")}</a>`).join("")}
                </div>
                <div class="ftr-quote">
                    <p class="mono">Grace</p>
                    <p>“${esc(s.epigraph.text)}”</p>
                    <p class="mono">${esc(s.epigraph.cite)}</p>
                </div>
            </div>
            <div class="ftr-bottom mono">
                <span>© ${new Date().getFullYear()} ${esc(s.author)}</span>
                <a href="#top" class="to-top">Back to top ${CM.icon("arrowUR")}</a>
            </div>
        </div>`;
    }

    /* ---------- boot ---------- */
    function boot() {
        CM.settings.apply();
        $$("[data-icon]").forEach((el) => el.insertAdjacentHTML("afterbegin", CM.icon(el.dataset.icon)));
        $$("[data-mark]").forEach((el) => el.insertAdjacentHTML("afterbegin", CM.mark()));
        paintThemeBtn();
        footer();
        CM.timers.init();
        CM.updateCounts();
        render();
        onScroll();
        document.documentElement.classList.add("is-ready");

        if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
            navigator.serviceWorker.register("sw.js").catch(() => {});
        }
    }
    boot();
})(window.CM);
