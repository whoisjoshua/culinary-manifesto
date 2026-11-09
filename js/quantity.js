/*
 * Amounts, units, temperatures and times: parsing, scaling and conversion.
 * Pure functions, no DOM. Loaded in the browser as CM.qty and in Node by tests/run.js.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.CM.qty = api;
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const GLYPH = {
        "¼": 1 / 4, "½": 1 / 2, "¾": 3 / 4, "⅐": 1 / 7, "⅑": 1 / 9, "⅒": 1 / 10, "⅓": 1 / 3, "⅔": 2 / 3,
        "⅕": 1 / 5, "⅖": 2 / 5, "⅗": 3 / 5, "⅘": 4 / 5, "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 1 / 8, "⅜": 3 / 8,
        "⅝": 5 / 8, "⅞": 7 / 8,
    };
    const FC = "[\\u00BC-\\u00BE\\u2150-\\u215E]";
    // 1½ | 1 1/2 | 1/2 | .5 | 1.5 | 2 | ½
    const NUM = `(?:\\d+(?:\\.\\d+)?\\s?${FC}|\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d*\\.\\d+|\\d+|${FC})`;
    const SEP = "\\s*(?:-|–|—|to|or)\\s*";

    // key, aliases, kind, size in ml (vol) or g (mass), singular, plural, isMetric
    const UNIT_LIST = [
        ["tsp", "teaspoons?|tsps?\\.?", "vol", 4.92892, "tsp", "tsp"],
        ["tbsp", "tablespoons?|tbsps?\\.?|tbls?\\.?|tbs\\.?", "vol", 14.7868, "tbsp", "tbsp"],
        ["floz", "fl\\.?\\s?oz\\.?|fluid\\s+ounces?", "vol", 29.5735, "fl oz", "fl oz"],
        ["cup", "cups?", "vol", 236.588, "cup", "cups"],
        ["pint", "pints?|pts?\\.?", "vol", 473.176, "pint", "pints"],
        ["quart", "quarts?|qts?\\.?", "vol", 946.353, "quart", "quarts"],
        ["ml", "milliliters?|millilitres?|mls?", "vol", 1, "ml", "ml", true],
        ["l", "liters?|litres?|l", "vol", 1000, "l", "l", true],
        ["kg", "kilograms?|kilos?|kgs?", "mass", 1000, "kg", "kg", true],
        ["g", "grams?|g", "mass", 1, "g", "g", true],
        ["oz", "ounces?|oz\\.?", "mass", 28.3495, "oz", "oz"],
        ["lb", "pounds?|lbs?\\.?", "mass", 453.592, "lb", "lb"],
        ["stick", "sticks?", "mass", 113.398, "stick", "sticks"], // of butter
        ["pinch", "pinch(?:es)?", "count", 1, "pinch", "pinches"],
        ["dash", "dash(?:es)?", "count", 1, "dash", "dashes"],
        ["clove", "cloves?", "count", 1, "clove", "cloves"],
        ["piece", "pieces?|pcs?\\.?", "count", 1, "piece", "pieces"],
        ["slice", "slices?", "count", 1, "slice", "slices"],
        ["can", "cans?", "count", 1, "can", "cans"],
        ["bunch", "bunch(?:es)?", "count", 1, "bunch", "bunches"],
        ["sprig", "sprigs?", "count", 1, "sprig", "sprigs"],
        ["handful", "handfuls?", "count", 1, "handful", "handfuls"],
        ["head", "heads?", "count", 1, "head", "heads"],
    ];
    const UNITS = {};
    UNIT_LIST.forEach(([key, re, kind, size, one, many, metric]) => {
        UNITS[key] = { key, re: new RegExp(`^(?:${re})$`, "i"), kind, size, one, many, metric: !!metric };
    });
    const UNIT_ALT = UNIT_LIST.map((u) => u[1]).join("|");
    const LEAD = new RegExp(`^\\s*(${NUM})(?:(${SEP})(${NUM}))?(?:\\s*(${UNIT_ALT}))?(?![A-Za-z0-9/])`, "i");

    function toNum(s) {
        s = s.trim();
        let m;
        if ((m = /^(\d+(?:\.\d+)?)\s?([¼-¾⅐-⅞])$/.exec(s))) return +m[1] + GLYPH[m[2]];
        if ((m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s))) return +m[1] + m[2] / m[3];
        if ((m = /^(\d+)\/(\d+)$/.exec(s))) return m[1] / m[2];
        if (GLYPH[s] != null) return GLYPH[s];
        return parseFloat(s);
    }

    function unitOf(s) {
        const t = s.replace(/\s+/g, " ").trim();
        for (const k in UNITS) if (UNITS[k].re.test(t)) return k;
        return null;
    }

    /** Leading amount of an ingredient line, or null. "¼ - ½ cup water" -> { a: .25, b: .5, sep: "-", unit: "cup", ... } */
    function parse(text) {
        const m = LEAD.exec(text);
        if (!m) return null;
        const a = toNum(m[1]);
        const b = m[3] != null ? toNum(m[3]) : null;
        if (!isFinite(a) || (b != null && !isFinite(b))) return null;
        return {
            a,
            b,
            sep: m[2] ? m[2].trim().toLowerCase() : null,
            unit: m[4] ? unitOf(m[4]) : null,
            src: m[0].trim(),
            rest: text.slice(m[0].length).replace(/^\s+/, ""),
        };
    }

    const NICE = [
        [0, ""], [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"], [1 / 2, "½"],
        [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"], [1, ""],
    ];
    const trim = (s) => s.replace(/\.0+$|(\.\d*?)0+$/, "$1");

    /** Kitchen fractions: 1.5 -> "1½", 0.333 -> "⅓". */
    function fmtFrac(n) {
        if (n <= 0) return "0";
        if (n < 1 / 16) return trim(n.toFixed(2));
        if (n >= 20) return String(Math.round(n));
        let whole = Math.floor(n);
        const f = n - whole;
        let best = NICE[0];
        for (const c of NICE) if (Math.abs(f - c[0]) < Math.abs(f - best[0])) best = c;
        if (best[0] === 1) {
            whole += 1;
            best = NICE[0];
        }
        return (whole ? String(whole) : "") + best[1] || "0";
    }

    function fmtMetric(n) {
        if (n < 10) return trim(n.toFixed(1));
        if (n < 100) return String(Math.round(n));
        return String(Math.round(n / 5) * 5);
    }

    const isNice = (v, dens) => dens.some((d) => Math.abs(v * d - Math.round(v * d)) < 0.05);

    /** Best US volume unit for an amount in ml: prefers cups, then tbsp, then tsp, whichever reads cleanly. */
    function pickUSVol(ml) {
        const cups = ml / UNITS.cup.size;
        const tbsp = ml / UNITS.tbsp.size;
        if (cups >= 0.25 && isNice(cups, [2, 3, 4])) return "cup";
        if (cups >= 1) return "cup";
        if (tbsp >= 1 && isNice(tbsp, [2])) return "tbsp";
        return "tsp";
    }

    function metricUnit(kind, base) {
        if (kind === "vol") return base >= 1000 ? "l" : "ml";
        return base >= 1000 ? "kg" : "g";
    }

    function fmtIn(base, unit) {
        const u = UNITS[unit];
        const v = base / u.size;
        if (u.metric) {
            if (unit === "l" || unit === "kg") return trim(v.toFixed(v >= 10 ? 0 : v >= 2 ? 1 : 2));
            return fmtMetric(v);
        }
        return fmtFrac(v);
    }

    // "1", "½", "0.5" read as singular; "1½", "2" as plural.
    const isOne = (shown) => /^(?:1|0(?:\.\d+)?|\.\d+|[^\d]+)$/.test(shown);

    const SEP_OUT = { "-": "–", "–": "–", "—": "–", to: "–", or: " or " };

    /**
     * Display string for a parsed amount.
     * system: "original" (as written) | "metric" | "us".  At 1x in the original system the text is returned untouched.
     */
    function format(q, scale, system) {
        scale = scale || 1;
        system = system || "original";
        const u = q.unit ? UNITS[q.unit] : null;
        const convertible = !!u && (u.kind === "vol" || u.kind === "mass");
        const toMetric = system === "metric" && convertible && !u.metric;
        const toUS = system === "us" && convertible && u.metric;
        if (scale === 1 && !toMetric && !toUS) return q.src;

        const a = q.a * scale;
        const b = q.b != null ? q.b * scale : null;
        const sep = q.b != null ? SEP_OUT[q.sep] || "–" : "";

        if (!convertible) {
            const shown = fmtFrac(b != null ? b : a);
            const label = u ? (isOne(shown) ? u.one : u.many) : "";
            return (b != null ? fmtFrac(a) + sep : "") + shown + (label ? " " + label : "");
        }

        const baseA = a * u.size;
        const baseB = b != null ? b * u.size : null;
        let unit = q.unit;
        if (toMetric || (system === "metric" && u.metric)) unit = metricUnit(u.kind, baseA);
        else if (toUS) unit = u.kind === "vol" ? pickUSVol(baseA) : baseA >= 453.592 ? "lb" : "oz";
        else if (u.metric) unit = metricUnit(u.kind, baseA);
        else if (["tsp", "tbsp", "cup"].includes(q.unit)) unit = pickUSVol(baseA);

        const out = UNITS[unit];
        const shown = fmtIn(baseB != null ? baseB : baseA, unit);
        return (baseB != null ? fmtIn(baseA, unit) + sep : "") + shown + " " + (isOne(shown) ? out.one : out.many);
    }

    /* ---------- temperatures and times inside step text ---------- */

    const TEMP = /(\d{2,3})(?:\s*(?:-|–|to)\s*(\d{2,3}))?\s*(?:°\s*|degrees?\s+|deg\.?\s+)([FC])\b/gi;
    const TIME = /\b(?:(an?|one)\s+(hour|minute)|(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?))\b/gi;

    function findTemps(text) {
        const out = [];
        let m;
        TEMP.lastIndex = 0;
        while ((m = TEMP.exec(text))) {
            out.push({ start: m.index, end: m.index + m[0].length, a: +m[1], b: m[2] ? +m[2] : null, unit: m[3].toUpperCase(), src: m[0] });
        }
        return out;
    }

    const round5 = (n) => Math.round(n / 5) * 5;
    const fToC = (f) => ((f - 32) * 5) / 9;
    const cToF = (c) => (c * 9) / 5 + 32;

    /** "375 - 425 degrees F" -> "375–425 °F", or "190–220 °C" in metric. */
    function formatTemp(t, system) {
        let unit = t.unit;
        let a = t.a;
        let b = t.b;
        if (system === "metric" && unit === "F") {
            a = round5(fToC(a));
            b = b != null ? round5(fToC(b)) : null;
            unit = "C";
        } else if (system === "us" && unit === "C") {
            a = round5(cToF(a));
            b = b != null ? round5(cToF(b)) : null;
            unit = "F";
        }
        return (b != null ? a + "–" + b : String(a)) + " °" + unit;
    }

    /** The other unit, for a tooltip. */
    function otherTemp(t) {
        return formatTemp(t, t.unit === "F" ? "metric" : "us");
    }

    function findTimes(text) {
        const out = [];
        let m;
        TIME.lastIndex = 0;
        while ((m = TIME.exec(text))) {
            let minutes;
            if (m[2]) minutes = m[2].toLowerCase() === "hour" ? 60 : 1;
            else {
                const n = parseFloat(m[3]);
                const unit = m[5].toLowerCase();
                minutes = unit.startsWith("h") ? n * 60 : unit.startsWith("s") ? n / 60 : n;
            }
            out.push({ start: m.index, end: m.index + m[0].length, minutes, src: m[0] });
        }
        return out;
    }

    /* ---------- plain conversions for the Tools page ---------- */

    function convert(value, from, to) {
        if (from === "F" || from === "C") {
            if (from === to) return value;
            return from === "F" ? fToC(value) : cToF(value);
        }
        const f = UNITS[from];
        const t = UNITS[to];
        if (!f || !t || f.kind !== t.kind) return NaN;
        return (value * f.size) / t.size;
    }

    return { parse, format, fmtFrac, fmtMetric, findTemps, formatTemp, otherTemp, findTimes, convert, fToC, cToF, UNITS };
});
