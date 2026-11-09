/*
 * Home: hero, epigraph, and short teasers for the Cookbook (latest recipes) and Manifesting (up next).
 */
(function (CM) {
    "use strict";
    const { esc, pad, $, $$, isCJK, fmtDate } = CM.util;
    const PRIORITY = { critical: 0, high: 1, medium: 2, low: 3 };

    function badge() {
        const text = `${CM.site.title} · ${CM.site.tagline} · Est. ${CM.site.est} · `.toUpperCase();
        return `
        <a class="spin-badge" href="#/cookbook" aria-label="See the recipes">
            <svg viewBox="0 0 200 200" aria-hidden="true">
                <defs><path id="ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>
                <text><textPath href="#ring" textLength="488" lengthAdjust="spacing">${esc(text)}</textPath></text>
            </svg>
            ${CM.mark("spin-badge-mark")}
        </a>`;
    }

    function teaser({ id, title, lede, items, more, href }) {
        return `
            <section class="teaser wrap" id="${id}">
                <header class="sec-head reveal">
                    <h2 class="sec-title">${title}</h2>
                    <p class="sec-lede">${lede}</p>
                </header>
                <ol class="teaser-list">
                    ${items.map((html, i) => `<li class="reveal" style="--i:${i}">${html}</li>`).join("")}
                </ol>
                <a class="text-link" href="${href}">${more} ${CM.icon("arrowR")}</a>
            </section>`;
    }

    CM.views.home = {
        title: () => `${CM.site.title} · ${CM.site.tagline}`,
        render(main) {
            const recipes = CM.recipes;
            const open = CM.manifestingItems().filter((m) => !m.done);
            const next = open.slice().sort((a, b) => (PRIORITY[a.priority] ?? 9) - (PRIORITY[b.priority] ?? 9)).slice(0, 3);
            // newest first: by `added` when recipes have it, otherwise the last ones written down
            const latest = recipes
                .map((r, i) => ({ r, n: i + 1 }))
                .sort((a, b) => String(b.r.added || "").localeCompare(String(a.r.added || "")) || b.n - a.n)
                .slice(0, 3);
            const words = CM.site.epigraph.text.split(/\s+/);
            const firstVisit = !sessionStorage.getItem("cm:intro");
            try {
                sessionStorage.setItem("cm:intro", "1");
            } catch (e) {}
            const marquee = recipes.map((r) => `<span class="${isCJK(r.title) ? "zh" : ""}">${esc(r.title)}</span><i>✺</i>`).join("");

            main.innerHTML = `
            <section class="hero wrap${firstVisit ? " is-intro" : ""}">
                <div class="hero-top mono">
                    <span>(Est. ${esc(CM.site.est)})</span>
                    <span class="hide-sm">A personal cookbook</span>
                    <span>cook.jzeng.io</span>
                </div>
                <h1 class="hero-title" aria-label="${esc(CM.site.title)}">
                    <span class="line"><span>Culinary</span></span>
                    <span class="line line--2"><span><em>Manifesto</em></span></span>
                </h1>
                <div class="hero-foot">
                    <p class="hero-lede">Recipes I've cooked, the dishes I'm manifesting, and the notes in between. <strong>${esc(CM.site.tagline)}.</strong></p>
                    <dl class="hero-stats">
                        <div><dt class="mono">Recipes</dt><dd>${pad(recipes.length)}</dd></div>
                        <div><dt class="mono">Manifesting</dt><dd>${pad(open.length)}</dd></div>
                        <div><dt class="mono">Updated</dt><dd class="sm">${esc(fmtDate(CM.site.updated, { month: "short", day: "numeric", year: "numeric" }))}</dd></div>
                    </dl>
                    ${badge()}
                </div>
            </section>

            <div class="marquee" aria-hidden="true"><div class="marquee-track">${marquee}${marquee}${marquee}${marquee}</div></div>

            <section class="epigraph wrap">
                <p class="kicker mono">(Grace)</p>
                <blockquote class="epi-text">${words.map((w, i) => `<span style="--w:${i}">${esc(w)}</span>`).join(" ")}</blockquote>
                <cite class="mono">${esc(CM.site.epigraph.cite)}</cite>
            </section>

            ${
                latest.length
                    ? teaser({
                          id: "latest",
                          title: `From the <em>cookbook</em> <sup class="mono">(${pad(recipes.length)})</sup>`,
                          lede: "The latest written down. Tap one to cook along.",
                          href: "#/cookbook",
                          more: `See all ${recipes.length} recipes`,
                          items: latest.map(
                              ({ r, n }) => `<a href="#/r/${esc(r.slug)}">
                        <span class="teaser-num mono">No. ${pad(n)}</span>
                        <span class="teaser-title${isCJK(r.title) ? " zh" : ""}">${esc(r.title)}${r.en ? ` <span class="teaser-en">${esc(r.en)}</span>` : ""}</span>
                        <span class="r-go" aria-hidden="true">${CM.icon("arrowUR")}</span></a>`
                          ),
                      })
                    : ""
            }

            ${
                next.length
                    ? teaser({
                          id: "up-next",
                          title: "<em>Up next</em>",
                          lede: "The top of the Manifesting list.",
                          href: "#/manifesting",
                          more: "See the full list",
                          items: next.map(
                              (m) => `<a href="#/manifesting">
                        <span class="prio prio--${esc(m.priority || "low")} mono">${esc(m.priority || "someday")}</span>
                        <span class="teaser-title">${esc(m.title)}</span>
                        <span class="r-go" aria-hidden="true">${CM.icon("arrowUR")}</span></a>`
                          ),
                      })
                    : ""
            }`;

            /* epigraph: words light up as it scrolls through the viewport */
            const epi = $(".epi-text", main);
            const spans = $$("span", epi);
            let raf = 0;
            const paint = () => {
                raf = 0;
                const r = epi.getBoundingClientRect();
                const vh = window.innerHeight;
                const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
                const lit = p * (spans.length + 2);
                spans.forEach((s, i) => s.classList.toggle("is-lit", i < lit));
            };
            const onScroll = () => raf || (raf = requestAnimationFrame(paint));
            if (CM.settings.reducedMotion()) spans.forEach((s) => s.classList.add("is-lit"));
            else {
                window.addEventListener("scroll", onScroll, { passive: true });
                paint();
            }

            return () => window.removeEventListener("scroll", onScroll);
        },
    };
})(window.CM);
