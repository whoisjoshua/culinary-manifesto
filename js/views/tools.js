/*
 * Tools: unit converter, cups <-> grams, servings scaler, pan size scaler, oven chart and a timer.
 */
(function (CM) {
    "use strict";
    const { esc, $, $$ } = CM.util;
    const Q = () => CM.qty;

    const UNIT_GROUPS = [
        ["Volume", [["tsp", "teaspoon"], ["tbsp", "tablespoon"], ["floz", "fl oz"], ["cup", "cup"], ["pint", "pint"], ["quart", "quart"], ["ml", "ml"], ["l", "liter"]]],
        ["Weight", [["g", "gram"], ["kg", "kilogram"], ["oz", "ounce"], ["lb", "pound"]]],
        ["Temperature", [["F", "°F"], ["C", "°C"]]],
    ];
    const UNIT_NAME = Object.fromEntries(UNIT_GROUPS.flatMap(([, us]) => us));

    // grams per US cup (approximate; scooped flour and packed brown sugar)
    const DENSITY = [
        ["All-purpose flour", 120],
        ["Granulated sugar", 200],
        ["Brown sugar, packed", 213],
        ["Powdered sugar", 113],
        ["Butter", 227],
        ["Water", 237],
        ["Milk", 242],
        ["Vegetable oil", 218],
        ["Honey", 336],
        ["Cornstarch", 112],
        ["Cocoa powder", 84],
        ["Rolled oats", 89],
        ["White rice, uncooked", 185],
        ["Table salt", 288],
        ["Kosher salt (Diamond Crystal)", 135],
        ["Kosher salt (Morton)", 230],
    ];
    const MEASURES = [["cup", 1], ["tbsp", 1 / 16], ["tsp", 1 / 48]];

    const OVEN = [
        [250, 120, "½", "Very low"],
        [275, 140, "1", "Very low"],
        [300, 150, "2", "Low"],
        [325, 165, "3", "Moderately low"],
        [350, 180, "4", "Moderate"],
        [375, 190, "5", "Moderately hot"],
        [400, 200, "6", "Hot"],
        [425, 220, "7", "Hot"],
        [450, 230, "8", "Very hot"],
        [475, 245, "9", "Very hot"],
    ];

    const num = (v) => {
        const p = Q().parse(String(v));
        return p ? p.a : parseFloat(v);
    };
    const nice = (n, unit) => {
        if (!isFinite(n)) return "–";
        if (unit === "F" || unit === "C") return String(Math.round(n));
        const u = Q().UNITS[unit];
        if (u && !u.metric && n < 20) return Q().fmtFrac(n);
        if (n >= 100) return String(Math.round(n));
        return String(+n.toFixed(n < 1 ? 3 : 2));
    };

    CM.views.tools = {
        title: () => `Tools · ${CM.site.title}`,
        render(main) {
            main.innerHTML = `
            <section class="page-hero wrap">
                <p class="kicker mono">(04) Kitchen math</p>
                <h1 class="page-title"><span class="line"><span><em>Tools</em></span></span></h1>
                <p class="lede">Converters and calculators for when the recipe and the kitchen disagree.</p>
            </section>
            <section class="wrap tools">
                <article class="tool reveal" id="t-convert">
                    <h2 class="tool-title"><span class="mono">01</span> Unit converter</h2>
                    <div class="tool-row">
                        <label class="field"><span class="mono">Amount</span><input id="cv-n" inputmode="decimal" value="1" aria-label="Amount"></label>
                        <label class="field field--grow"><span class="mono">From</span>
                            <select id="cv-u">${UNIT_GROUPS.map(([g, us]) => `<optgroup label="${g}">${us.map(([k, l]) => `<option value="${k}"${k === "cup" ? " selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>`).join("")}</select>
                        </label>
                    </div>
                    <ul class="out-list" id="cv-out" aria-live="polite"></ul>
                </article>

                <article class="tool reveal" id="t-grams">
                    <h2 class="tool-title"><span class="mono">02</span> Cups ⇄ grams</h2>
                    <label class="field"><span class="mono">Ingredient</span>
                        <select id="cg-i">${DENSITY.map(([n, g], i) => `<option value="${i}">${esc(n)}</option>`).join("")}</select>
                    </label>
                    <div class="tool-row tool-row--eq">
                        <label class="field"><span class="mono">Volume</span><input id="cg-v" inputmode="decimal" value="1"></label>
                        <label class="field field--narrow"><span class="mono">Unit</span><select id="cg-m">${MEASURES.map(([m]) => `<option value="${m}">${m}</option>`).join("")}</select></label>
                        <span class="eq" aria-hidden="true">=</span>
                        <label class="field"><span class="mono">Grams</span><input id="cg-g" inputmode="decimal"></label>
                    </div>
                    <p class="tool-hint">Approximate. Flour is spooned and leveled, brown sugar packed. A scale always wins.</p>
                </article>

                <article class="tool reveal" id="t-serve">
                    <h2 class="tool-title"><span class="mono">03</span> Servings scaler</h2>
                    <div class="tool-row">
                        <label class="field"><span class="mono">Recipe serves</span><input id="sv-a" inputmode="decimal" value="4"></label>
                        <label class="field"><span class="mono">Cooking for</span><input id="sv-b" inputmode="decimal" value="6"></label>
                    </div>
                    <p class="big-out"><span id="sv-f">1.5×</span> <span class="mono">multiply everything</span></p>
                    <label class="field"><span class="mono">Try a line</span><input id="sv-line" value="¾ cup brown sugar" aria-label="Ingredient line to scale"></label>
                    <p class="tool-out" id="sv-out" aria-live="polite"></p>
                </article>

                <article class="tool reveal" id="t-pan">
                    <h2 class="tool-title"><span class="mono">04</span> Pan size</h2>
                    <div class="pan-grid">
                        ${["from", "to"]
                            .map(
                                (w, i) => `
                        <fieldset class="pan" data-pan="${w}">
                            <legend class="mono">${w === "from" ? "Recipe pan" : "My pan"}</legend>
                            <select data-k="shape" aria-label="Shape">
                                <option value="round">Round</option><option value="square"${i ? " selected" : ""}>Square</option><option value="rect">Rectangle</option>
                            </select>
                            <span class="pan-dims">
                                <input data-k="a" inputmode="decimal" value="${i ? 8 : 9}" aria-label="Diameter or side">
                                <span class="pan-x" data-x>×</span>
                                <input data-k="b" inputmode="decimal" value="${i ? 8 : 13}" aria-label="Second side">
                            </span>
                        </fieldset>`
                            )
                            .join("")}
                    </div>
                    <p class="big-out"><span id="pan-f">1×</span> <span class="mono" id="pan-note">batch</span></p>
                    <p class="tool-hint">Same units for both pans (inches or cm). A bigger, shallower pan bakes faster; check early.</p>
                </article>

                <article class="tool reveal" id="t-oven">
                    <h2 class="tool-title"><span class="mono">05</span> Oven temperatures</h2>
                    <table class="oven">
                        <thead><tr><th scope="col">°F</th><th scope="col">°C</th><th scope="col">Gas</th><th scope="col"><span class="sr">Heat</span></th></tr></thead>
                        <tbody>${OVEN.map(([f, c, g, d]) => `<tr><td>${f}</td><td>${c}</td><td>${g}</td><td>${d}</td></tr>`).join("")}</tbody>
                    </table>
                    <p class="tool-hint">For fan or convection ovens, drop about 25 °F / 15 °C.</p>
                </article>

                <article class="tool reveal" id="t-timer">
                    <h2 class="tool-title"><span class="mono">06</span> Timer</h2>
                    <div class="presets">${[1, 3, 5, 10, 15, 20, 30, 45, 60].map((m) => `<button type="button" class="chip-f" data-min="${m}">${m < 60 ? m + " min" : "1 hr"}</button>`).join("")}</div>
                    <form class="tool-row" id="tm-form" autocomplete="off">
                        <label class="field field--narrow"><span class="mono">Minutes</span><input name="min" inputmode="decimal" value="12" required></label>
                        <label class="field field--grow"><span class="mono">Label</span><input name="label" placeholder="Rice" maxlength="40"></label>
                        <button type="submit" class="pill pill--accent">${CM.icon("play")}<span>Start</span></button>
                    </form>
                    <p class="tool-hint">Timers stay in the corner while you browse, and chime when done${"vibrate" in navigator ? " (and buzz)" : ""}.</p>
                </article>
            </section>`;

            /* 01 converter */
            const cvN = $("#cv-n", main);
            const cvU = $("#cv-u", main);
            function convert() {
                const v = num(cvN.value);
                const from = cvU.value;
                const group = UNIT_GROUPS.find(([, us]) => us.some(([k]) => k === from))[1];
                $("#cv-out", main).innerHTML = group
                    .filter(([k]) => k !== from)
                    .map(([k, l]) => `<li><span class="out-n">${esc(nice(Q().convert(v, from, k), k))}</span> <span class="out-u">${esc(l)}</span></li>`)
                    .join("");
            }
            cvN.addEventListener("input", convert);
            cvU.addEventListener("change", convert);
            convert();

            /* 02 cups <-> grams */
            const cgI = $("#cg-i", main), cgV = $("#cg-v", main), cgM = $("#cg-m", main), cgG = $("#cg-g", main);
            const perUnit = () => DENSITY[+cgI.value][1] * MEASURES.find(([m]) => m === cgM.value)[1];
            const toG = () => {
                const v = num(cgV.value);
                cgG.value = isFinite(v) ? String(Math.round(v * perUnit() * 10) / 10) : "";
            };
            const toV = () => {
                const g = num(cgG.value);
                cgV.value = isFinite(g) ? Q().fmtFrac(g / perUnit()) : "";
            };
            cgV.addEventListener("input", toG);
            cgG.addEventListener("input", toV);
            cgI.addEventListener("change", toG);
            cgM.addEventListener("change", toG);
            toG();

            /* 03 servings */
            function serve() {
                const a = num($("#sv-a", main).value);
                const b = num($("#sv-b", main).value);
                const f = a > 0 && b > 0 ? b / a : NaN;
                $("#sv-f", main).textContent = isFinite(f) ? +f.toFixed(2) + "×" : "–";
                const line = $("#sv-line", main).value;
                const q = Q().parse(line);
                $("#sv-out", main).innerHTML =
                    q && isFinite(f)
                        ? `<b>${esc(Q().format(q, f, CM.settings.get("units")))}</b> ${esc(q.rest)}`
                        : `<span class="muted">Start the line with an amount, like "2 cups flour".</span>`;
            }
            $$("#sv-a, #sv-b, #sv-line", main).forEach((el) => el.addEventListener("input", serve));
            serve();

            /* 04 pan size */
            function area(fs) {
                const shape = $('[data-k="shape"]', fs).value;
                const a = num($('[data-k="a"]', fs).value);
                const b = num($('[data-k="b"]', fs).value);
                $("[data-x]", fs).hidden = shape !== "rect";
                $('[data-k="b"]', fs).hidden = shape !== "rect";
                if (shape === "round") return Math.PI * (a / 2) ** 2;
                if (shape === "square") return a * a;
                return a * b;
            }
            function pan() {
                const f = area($('[data-pan="to"]', main)) / area($('[data-pan="from"]', main));
                $("#pan-f", main).textContent = isFinite(f) && f > 0 ? +f.toFixed(2) + "×" : "–";
                $("#pan-note", main).textContent = !isFinite(f) ? "batch" : f > 1.05 ? "make more" : f < 0.95 ? "make less" : "about the same";
            }
            $(".pan-grid", main).addEventListener("input", pan);
            $(".pan-grid", main).addEventListener("change", pan);
            pan();

            /* 06 timer */
            $(".presets", main).addEventListener("click", (e) => {
                const b = e.target.closest("[data-min]");
                if (b) CM.timers.start(+b.dataset.min);
            });
            $("#tm-form", main).addEventListener("submit", (e) => {
                e.preventDefault();
                const f = e.target.elements;
                const m = num(f.min.value);
                if (!(m > 0)) return CM.toast("Minutes should be a number above 0");
                CM.timers.start(m, f.label.value.trim() || undefined);
            });

            const off = CM.settings.on((k) => (k === "units" || k === "*") && serve());
            return off;
        },
    };
})(window.CM);
