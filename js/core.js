/*
 * Shared helpers: escaping, storage, settings, icons, the logo, rich text (glossary + timers +
 * temperatures), generated plates, toasts and the glossary popover.
 */
(function (CM) {
    "use strict";
    CM.views = CM.views || {};

    /* ---------- small utils ---------- */
    const esc = (s) =>
        String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const hash = (s) => {
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        return (h >>> 0).toString(36);
    };
    const isCJK = (s) => /[㐀-鿿豈-﫿]/.test(s || "");
    const pad = (n) => String(n).padStart(2, "0");
    const $ = (sel, el) => (el || document).querySelector(sel);
    const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
    const debounce = (fn, ms) => {
        let t;
        return (...a) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...a), ms);
        };
    };
    const fmtDate = (iso, opts) => {
        if (!iso) return "";
        const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
        if (isNaN(d)) return iso;
        return d.toLocaleDateString(undefined, opts || { year: "numeric", month: "short", day: "numeric" });
    };
    const today = () => {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    CM.util = { esc, hash, isCJK, pad, $, $$, debounce, fmtDate, today };

    /* ---------- storage (localStorage, never throws) ---------- */
    const PREFIX = "cm:";
    CM.store = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem(PREFIX + key);
                return v == null ? fallback : JSON.parse(v);
            } catch (e) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(PREFIX + key, JSON.stringify(value));
            } catch (e) {
                /* private mode or full: the page still works, it just won't remember */
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(PREFIX + key);
            } catch (e) {}
        },
        keys(prefix) {
            const out = [];
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(PREFIX + (prefix || ""))) out.push(k.slice(PREFIX.length));
                }
            } catch (e) {}
            return out;
        },
    };

    /* ---------- settings ---------- */
    const DEFAULTS = { theme: "auto", text: "m", motion: "auto", units: "original", gloss: "tap", wake: true, sound: true };
    let settings = Object.assign({}, DEFAULTS, CM.store.get("settings", {}));
    const listeners = new Set();
    const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
    const motionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    // ?theme=night or ?motion=reduced in the URL override the saved setting for that visit (handy for sharing and testing)
    const urlTheme = new URLSearchParams(location.search).get("theme");
    const urlMotion = new URLSearchParams(location.search).get("motion");

    function resolvedTheme() {
        const t = urlTheme || settings.theme;
        if (t === "auto") return darkMQ.matches ? "dark" : "light";
        return t;
    }
    function applySettings() {
        const d = document.documentElement;
        d.dataset.theme = urlTheme || settings.theme;
        d.dataset.text = settings.text;
        d.dataset.motion = urlMotion || settings.motion;
        const colors = { light: "#f3f0ea", dark: "#0e0d0c", night: "#0b0705" };
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", colors[resolvedTheme()] || colors.light);
    }
    CM.settings = {
        DEFAULTS,
        get: (k) => settings[k],
        all: () => Object.assign({}, settings),
        set(k, v) {
            if (settings[k] === v) return;
            settings[k] = v;
            CM.store.set("settings", settings);
            applySettings();
            listeners.forEach((fn) => fn(k, v));
        },
        reset() {
            settings = Object.assign({}, DEFAULTS);
            CM.store.set("settings", settings);
            applySettings();
            listeners.forEach((fn) => fn("*"));
        },
        on(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        resolvedTheme,
        reducedMotion: () => {
            const m = urlMotion || settings.motion;
            return m === "reduced" || (m === "auto" && motionMQ.matches);
        },
        apply: applySettings,
    };
    darkMQ.addEventListener && darkMQ.addEventListener("change", () => {
        applySettings();
        listeners.forEach((fn) => fn("theme", settings.theme));
    });

    /* ---------- icons (24px stroke) ---------- */
    const P = {
        gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
        arrowL: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
        arrowUR: '<path d="M7 17 17 7M8 7h9v9"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
        flame: '<path d="M12 22c4 0 7-2.7 7-7 0-3.5-2.3-6-4-8 .2 2.3-1 3.7-2.2 3.7C11.4 10.7 12 7 9.5 3 9 7 5 9.5 5 15c0 4.3 3 7 7 7z"/>',
        share: '<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
        print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
        reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
        night: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/><path d="M17 3.5v3M15.5 5h3"/>',
        auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
        trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
        copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
        download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
        upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
        book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/>',
        sparkle: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
        pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        scale: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
        play: '<path d="M7 4.5v15l12-7.5z"/>',
        pause: '<path d="M8 5v14M16 5v14"/>',
        bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
        note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    };
    CM.icon = (name, cls) =>
        `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

    /* ---------- logo: a bowl with rising steam ---------- */
    CM.mark = (cls) => `
        <svg class="mark${cls ? " " + cls : ""}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path class="steam" pathLength="10" d="M17 18.5c-2.2-2.6 2.2-4.4 0-7.5"/>
            <path class="steam" pathLength="10" d="M24 18.5c-2.2-2.6 2.2-4.4 0-9"/>
            <path class="steam" pathLength="10" d="M31 18.5c-2.2-2.6 2.2-4.4 0-7.5"/>
            <path d="M6.5 24h35"/>
            <path class="bowl" d="M9.5 24a14.5 14.5 0 0 0 29 0"/>
            <path d="M19 41.5h10"/>
        </svg>`;

    /* ---------- generated plate (used until a recipe has a photo) ---------- */
    const HUES = [14, 32, 44, 96, 150, 200, 340];
    CM.plate = (r, cls) => {
        if (r.photo) {
            return `<div class="plate plate--photo${cls ? " " + cls : ""}"><img src="${esc(r.photo)}" alt="${esc(r.en || r.title)}" loading="lazy"></div>`;
        }
        const h = r.hue != null ? r.hue : HUES[parseInt(hash(r.slug || r.title), 36) % HUES.length];
        const glyph = Array.from(r.title || "?")[0];
        return `<div class="plate${cls ? " " + cls : ""}" style="--h:${+h}" aria-hidden="true"><span class="plate-glyph${isCJK(glyph) ? " zh" : ""}">${esc(glyph)}</span></div>`;
    };

    /* ---------- rich text: glossary terms, timers, temperatures ---------- */
    let glossTerms = null;
    const terms = () => (glossTerms = glossTerms || Object.keys(CM.glossary || {}).sort((a, b) => b.length - a.length));

    /**
     * Escape text and decorate it.  opts: { gloss: bool, chips: bool }
     * Returns HTML. Never trusts the input: every plain segment goes through esc().
     */
    CM.rich = (text, opts) => {
        opts = opts || {};
        text = String(text == null ? "" : text);
        const marks = [];
        if (opts.chips) {
            CM.qty.findTimes(text).forEach((m) => marks.push(Object.assign({ type: "time" }, m)));
            CM.qty.findTemps(text).forEach((m) => marks.push(Object.assign({ type: "temp" }, m)));
        }
        if (opts.gloss !== false && isCJK(text)) {
            terms().forEach((term) => {
                let i = text.indexOf(term);
                while (i >= 0) {
                    marks.push({ type: "gloss", start: i, end: i + term.length, term });
                    i = text.indexOf(term, i + term.length);
                }
            });
        }
        marks.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
        let out = "";
        let pos = 0;
        const system = CM.settings.get("units");
        for (const m of marks) {
            if (m.start < pos) continue;
            out += esc(text.slice(pos, m.start));
            const src = text.slice(m.start, m.end);
            if (m.type === "gloss") {
                const g = CM.glossary[m.term];
                out +=
                    CM.settings.get("gloss") === "inline"
                        ? `<span class="gloss-inline" lang="zh">${esc(src)}<span class="gloss-en" lang="en"> (${esc(g.en)})</span></span>`
                        : `<button type="button" class="gloss" lang="zh" data-term="${esc(m.term)}" aria-label="${esc(src)}: ${esc(g.en)}">${esc(src)}</button>`;
            } else if (m.type === "time") {
                out += `<button type="button" class="chip chip--time" data-min="${m.minutes}" title="Start a ${esc(CM.timers.label(m.minutes))} timer">${CM.icon("timer")}${esc(src)}</button>`;
            } else {
                out += `<span class="chip chip--temp" title="${esc(CM.qty.otherTemp(m))}">${esc(CM.qty.formatTemp(m, system))}</span>`;
            }
            pos = m.end;
        }
        return out + esc(text.slice(pos));
    };

    /* ---------- checklists: tapping anywhere on a .row toggles its checkbox ---------- */
    CM.rowToggle = (container) => {
        container.addEventListener("click", (e) => {
            if (e.target.closest("button, a, input, textarea, select, label")) return;
            if (window.getSelection && String(window.getSelection()).length) return; // let people select text
            const row = e.target.closest(".row");
            if (!row || !container.contains(row)) return;
            const input = row.querySelector(".row-input");
            if (!input || input.disabled) return;
            input.checked = !input.checked;
            input.dispatchEvent(new Event("change", { bubbles: true }));
        });
    };
    CM.CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" pathLength="1"/></svg>';

    /* ---------- toast ---------- */
    let toastTimer;
    CM.toast = (msg, opts) => {
        const el = $("#toast");
        if (!el) return;
        el.innerHTML = `<span>${esc(msg)}</span>${opts && opts.action ? `<button type="button" class="toast-act">${esc(opts.action)}</button>` : ""}`;
        el.classList.add("is-on");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("is-on"), (opts && opts.ms) || 2600);
        const act = $(".toast-act", el);
        if (act && opts.onAction)
            act.addEventListener("click", () => {
                el.classList.remove("is-on");
                opts.onAction();
            });
    };

    CM.copy = async (text, okMsg) => {
        try {
            await navigator.clipboard.writeText(text);
            CM.toast(okMsg || "Copied");
        } catch (e) {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand && document.execCommand("copy");
            ta.remove();
            CM.toast(ok ? okMsg || "Copied" : "Couldn't copy. Your browser blocked the clipboard.");
        }
    };

    /* ---------- glossary popover ---------- */
    function closeGloss() {
        const pop = $("#gloss-pop");
        if (pop) pop.remove();
        $$(".gloss.is-open").forEach((b) => b.classList.remove("is-open"));
    }
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".gloss");
        if (!btn) {
            if (!e.target.closest("#gloss-pop")) closeGloss();
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        const wasOpen = btn.classList.contains("is-open");
        closeGloss();
        if (wasOpen) return;
        const g = CM.glossary[btn.dataset.term];
        if (!g) return;
        btn.classList.add("is-open");
        const pop = document.createElement("div");
        pop.id = "gloss-pop";
        pop.className = "gloss-pop";
        pop.setAttribute("role", "tooltip");
        pop.innerHTML = `<span class="gp-zh" lang="zh">${esc(btn.dataset.term)}</span><span class="gp-py">${esc(g.py || "")}</span><span class="gp-en">${esc(g.en)}</span>`;
        document.body.appendChild(pop);
        const r = btn.getBoundingClientRect();
        const pw = pop.offsetWidth;
        const left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
        const above = r.top > pop.offsetHeight + 80;
        pop.style.left = left + "px";
        pop.style.top = (above ? r.top - pop.offsetHeight - 10 : r.bottom + 10) + window.scrollY + "px";
        pop.classList.toggle("is-below", !above);
        requestAnimationFrame(() => pop.classList.add("is-on"));
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeGloss());
    window.addEventListener("scroll", closeGloss, { passive: true });
    CM.closeGloss = closeGloss;
})(window.CM);
