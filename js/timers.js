/*
 * Kitchen timers. Tap a time in a step ("50 - 55 minutes") or use Tools > Timer.
 * Timers live in a dock at the bottom-right, survive page changes and reloads, and chime when done.
 */
(function (CM) {
    "use strict";
    const { esc, $ } = CM.util;
    let timers = CM.store.get("timers", []).filter((t) => !t.done || Date.now() - t.endAt < 60 * 60 * 1000);
    let tick = null;
    let audio = null;
    const baseTitle = () => document.title.replace(/^⏰ /, "");

    function label(minutes) {
        if (minutes < 1) return Math.round(minutes * 60) + " sec";
        if (minutes < 60) return +minutes.toFixed(1) + " min";
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return h + " hr" + (m ? " " + m + " min" : "");
    }
    function clock(ms) {
        const s = Math.max(0, Math.ceil(ms / 1000));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const ss = s % 60;
        return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(ss).padStart(2, "0");
    }
    const left = (t) => (t.paused ? t.remaining : t.endAt - Date.now());
    const save = () => CM.store.set("timers", timers);

    function unlockAudio() {
        try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            if (audio.state === "suspended") audio.resume();
        } catch (e) {}
    }
    function chime() {
        if (!CM.settings.get("sound") || !audio) return;
        try {
            const now = audio.currentTime;
            [0, 0.28, 0.56, 1.2, 1.48, 1.76].forEach((at, i) => {
                const o = audio.createOscillator();
                const g = audio.createGain();
                o.type = "sine";
                o.frequency.value = i % 3 === 2 ? 1046.5 : 880;
                g.gain.setValueAtTime(0.0001, now + at);
                g.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.24);
                o.connect(g).connect(audio.destination);
                o.start(now + at);
                o.stop(now + at + 0.26);
            });
        } catch (e) {}
    }

    function render() {
        const dock = $("#timers");
        if (!dock) return;
        dock.innerHTML = timers
            .map((t) => {
                const ms = left(t);
                const pct = t.done ? 100 : Math.min(100, Math.max(0, 100 - (ms / t.total) * 100));
                return `
                <div class="timer${t.done ? " is-done" : ""}${t.paused ? " is-paused" : ""}" data-id="${t.id}" style="--p:${pct}">
                    <span class="timer-ring" aria-hidden="true"></span>
                    <div class="timer-body">
                        <span class="timer-label">${esc(t.label)}</span>
                        <span class="timer-clock" role="timer">${t.done ? "Done" : clock(ms)}</span>
                    </div>
                    <div class="timer-acts">
                        ${t.done ? "" : `<button type="button" class="icon-btn sm" data-act="add" aria-label="Add one minute">+1</button>
                        <button type="button" class="icon-btn sm" data-act="toggle" aria-label="${t.paused ? "Resume" : "Pause"}">${CM.icon(t.paused ? "play" : "pause")}</button>`}
                        <button type="button" class="icon-btn sm" data-act="close" aria-label="${t.done ? "Dismiss" : "Cancel timer"}">${CM.icon("x")}</button>
                    </div>
                </div>`;
            })
            .join("");
        document.body.classList.toggle("has-timers", timers.length > 0);
    }

    function update() {
        let changed = false;
        timers.forEach((t) => {
            if (!t.done && !t.paused && t.endAt <= Date.now()) {
                t.done = true;
                changed = true;
                chime();
                if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 600]);
                CM.toast(`⏰ ${t.label} is done`, { ms: 6000 });
            }
        });
        if (changed) save();
        // update clocks in place (cheaper than re-rendering every tick)
        timers.forEach((t) => {
            const el = document.querySelector(`.timer[data-id="${t.id}"]`);
            if (!el) return;
            if (t.done && !el.classList.contains("is-done")) return render();
            const ms = left(t);
            const c = el.querySelector(".timer-clock");
            if (c && !t.done) c.textContent = clock(ms);
            el.style.setProperty("--p", t.done ? 100 : Math.min(100, Math.max(0, 100 - (ms / t.total) * 100)));
        });
        const ringing = timers.some((t) => t.done);
        const t = baseTitle();
        document.title = ringing && Math.floor(Date.now() / 1000) % 2 ? "⏰ " + t : t;
        if (!timers.length) stopTick();
    }
    function startTick() {
        if (!tick) tick = setInterval(update, 250);
    }
    function stopTick() {
        clearInterval(tick);
        tick = null;
        document.title = baseTitle();
    }

    function start(minutes, text) {
        unlockAudio();
        const ms = Math.round(minutes * 60 * 1000);
        const t = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: text || label(minutes), total: ms, endAt: Date.now() + ms, paused: false, done: false };
        timers.push(t);
        if (timers.length > 6) timers.shift();
        save();
        render();
        startTick();
        CM.toast(`Timer started: ${label(minutes)}`);
        return t;
    }

    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".timer [data-act]");
        if (!btn) return;
        unlockAudio();
        const id = btn.closest(".timer").dataset.id;
        const t = timers.find((x) => x.id === id);
        if (!t) return;
        const act = btn.dataset.act;
        if (act === "close") timers = timers.filter((x) => x !== t);
        else if (act === "add") {
            if (t.paused) t.remaining += 60000;
            else t.endAt += 60000;
            t.total += 60000;
        } else if (act === "toggle") {
            if (t.paused) {
                t.endAt = Date.now() + t.remaining;
                t.paused = false;
            } else {
                t.remaining = t.endAt - Date.now();
                t.paused = true;
            }
        }
        save();
        render();
        if (timers.length) startTick();
        else stopTick();
    });

    CM.timers = {
        start,
        label,
        init() {
            render();
            if (timers.length) startTick();
        },
    };
})(window.CM);
