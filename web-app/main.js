/*jslint browser*/
/*global Audio, AudioContext, Matter, Tone,
    cancelAnimationFrame, requestAnimationFrame*/
/**
 * main.js — UI wiring for Piano Mastermind.
 * Colours and layout positions are defined in default.css via
 * data-note attribute selectors and nth-child rules; this file
 * handles only behaviour and game logic.
 */

import Mastermind from "./Mastermind.js";
const {
    CHORD_MAX_ATTEMPTS,
    MAX_ATTEMPTS,
    NOTES,
    chord_is_lost,
    chord_is_over,
    chord_is_won,
    create_chord_game,
    create_game,
    get_attempt_count,
    get_attempts,
    get_remaining_attempts,
    get_secret,
    is_lost,
    is_over,
    is_won,
    make_chord_guess,
    make_guess,
    random_chord_secret,
    random_secret
} = Mastermind;

// ── Melody mode: famous tune codes ───────────────────────────────────────────
const MELODIES = [
    {
        code: ["A", "A", "A", "F"],
        description: "Beethoven's Symphony No. 5. It's a classic," +
        " so you'll probably know this.",
        youtube: "9aDEq3u5huA"
    },
    {
        code: ["E", "E", "F", "G"],
        description: "Beethoven's Ode to Joy.",
        youtube: "fzyO3fLV5O0"
    },
    {
        code: ["E", "D", "G", "F"],
        description: "Beethoven's Pathétique Sonata, 2nd movement." +
        " As a kid, I used to play this on the piano after" +
        " school, and it was roughly around the same time I" +
        " started really enjoying and appreciating music.",
        youtube: "1FP7NosLxkw"
    },
    {
        code: ["G", "C", "D", "E"],
        description: "Bach's Minuet in G. This was the first song" +
        " I learned on the piano :D.",
        youtube: "9W6RrBBZOQo"
    },
    {
        code: ["C", "G", "G", "E"],
        description: "Somewhere Only We Know by Keane. This is the" +
        " one song that reminds me of my childhood. We would" +
        " sing it as a whole school every year along with a" +
        " long list of different carols/hymns, and it was, in" +
        " my opinion, one of the best Christmas traditions in" +
        " my high school.",
        youtube: "Oextk-If8HQ"
    }
];

// ── Perfect pitch mode: 6-note melodies ──────────────────────────────────────
const PERFECT_PITCH_MELODIES = [
    {
        code: ["C", "C", "G", "G", "A", "A"],
        description: "Twinkle Twinkle Little Star."
    },
    {
        code: ["E", "D", "C", "D", "E", "E"],
        description: "Mary Had a Little Lamb."
    },
    {
        code: ["C", "C", "D", "C", "F", "E"],
        description: "Happy Birthday."
    },
    {
        code: ["G", "G", "G", "D", "E", "E"],
        description: "Old MacDonald Had a Farm."
    },
    {
        code: ["E", "E", "F", "G", "G", "F"],
        description: "Ode to Joy (opening phrase)."
    },
    {
        code: ["C", "C", "C", "D", "E", "E"],
        description: "Row Row Row Your Boat."
    },
    {
        code: ["C", "D", "E", "C", "C", "D"],
        description: "Frère Jacques."
    },
    {
        code: ["G", "A", "G", "F", "E", "F"],
        description: "London Bridge Is Falling Down."
    },
    {
        code: ["E", "D", "C", "E", "D", "C"],
        description: "Hot Cross Buns."
    },
    {
        code: ["C", "F", "F", "F", "G", "A"],
        description: "O Christmas Tree."
    },
    {
        code: ["C", "F", "A", "G", "F", "A"],
        description: "Amazing Grace."
    },
    {
        code: ["C", "E", "F", "G", "C", "E"],
        description: "When the Saints Go Marching In."
    },
    {
        code: ["C", "C", "B", "G", "A", "B"],
        description: "Somewhere Over the Rainbow."
    },
    {
        code: ["G", "E", "F", "G", "E", "F"],
        description: "Pachelbel's Canon."
    },
    {
        code: ["E", "G", "C", "D", "E", "G"],
        description: "Jingle Bells (chorus)."
    },
    {
        code: ["G", "G", "E", "G", "G", "A"],
        description: "Camptown Races."
    },
    {
        code: ["G", "A", "A", "G", "E", "G"],
        description: "Auld Lang Syne."
    },
    {
        code: ["C", "C", "D", "E", "C", "E"],
        description: "Yankee Doodle."
    },
    {
        code: ["C", "E", "G", "G", "A", "G"],
        description: "Michael Row the Boat Ashore."
    },
    {
        code: ["G", "E", "G", "A", "G", "E"],
        description: "This Old Man."
    }
];

// ── Chord mode game data ─────────────────────────────────────────────────────
const CHORD_NOTES_WHITE = ["C", "D", "E", "F", "G", "A", "B", "C2"];
const CHORD_NOTES_ALL = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B", "C2"
];
// Array indexed 0–3 matching ui.chord_difficulty values 1–4
const CHORD_DIFFICULTY_SETTINGS = [
    {count: 3, pool: CHORD_NOTES_WHITE},
    {count: 4, pool: CHORD_NOTES_WHITE},
    {count: 4, pool: CHORD_NOTES_ALL},
    {count: 5, pool: CHORD_NOTES_ALL}
];

// ── Piano audio: Tone.js note names and oscillator fallback frequencies ──────
const TONE_NOTE_NAMES = {
    A: "A4",
    "A#": "A#4",
    B: "B4",
    C: "C4",
    "C#": "C#4",
    "C#2": "C#5",
    C2: "C5",
    D: "D4",
    "D#": "D#4",
    "D#2": "D#5",
    D2: "D5",
    E: "E4",
    E2: "E5",
    F: "F4",
    "F#": "F#4",
    G: "G4",
    "G#": "G#4"
};

const FREQUENCIES = {
    A: 440.00,
    "A#": 466.16,
    B: 493.88,
    C: 261.63,
    "C#": 277.18,
    "C#2": 554.37,
    C2: 523.25,
    D: 293.66,
    "D#": 311.13,
    "D#2": 622.25,
    D2: 587.33,
    E: 329.63,
    E2: 659.25,
    F: 349.23,
    "F#": 369.99,
    G: 392.00,
    "G#": 415.30
};

let piano_sampler = null;
let piano_ready = false;
let fallback_ctx = null;

function get_fallback_ctx() {
    if (!fallback_ctx) {
        fallback_ctx = new AudioContext();
    }
    if (fallback_ctx.state === "suspended") {
        fallback_ctx.resume();
    }
    return fallback_ctx;
}

function init_piano() {
    if (piano_sampler) {
        return;
    }
    piano_sampler = new Tone.Sampler({
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        onload: function () {
            piano_ready = true;
        },
        urls: {
            A0: "A0.mp3",
            A1: "A1.mp3",
            A2: "A2.mp3",
            A3: "A3.mp3",
            A4: "A4.mp3",
            A5: "A5.mp3",
            C1: "C1.mp3",
            C2: "C2.mp3",
            C3: "C3.mp3",
            C4: "C4.mp3",
            C5: "C5.mp3",
            C6: "C6.mp3",
            "D#1": "Ds1.mp3",
            "D#2": "Ds2.mp3",
            "D#3": "Ds3.mp3",
            "D#4": "Ds4.mp3",
            "D#5": "Ds5.mp3",
            "F#1": "Fs1.mp3",
            "F#2": "Fs2.mp3",
            "F#3": "Fs3.mp3",
            "F#4": "Fs4.mp3",
            "F#5": "Fs5.mp3"
        }
    }).toDestination();
}

// ── Button click sounds ──────────────────────────────────────────────────────
const CLICK_AUDIO = {
    "btn-a11y": new Audio("sounds/click_c.mp3"),
    "btn-how-to-play": new Audio("sounds/click_c.mp3"),
    "btn-mode": new Audio("sounds/click_c.mp3"),
    "btn-new-game": new Audio("sounds/click_c.mp3")
};
Object.values(CLICK_AUDIO).forEach(function (a) {
    a.load();
});

function play_click_for(id) {
    const a = CLICK_AUDIO[id];
    if (!a) {
        return;
    }
    a.currentTime = 0;
    a.play().catch(function () {
        return undefined;
    });
}

function play_note(note) {
    const tone_name = TONE_NOTE_NAMES[note];
    const freq = FREQUENCIES[note];
    if (piano_ready && tone_name) {
        Tone.start().then(function () {
            piano_sampler.triggerAttack(tone_name, Tone.now());
        });
    } else if (freq) {
        const ctx = get_fallback_ctx();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.0);
    }
}

// ── UI state ─────────────────────────────────────────────────────────────────
const ui = {
    a11y: false,
    active_row: 0,
    board_rows: [],
    chord_active_row: 0,
    chord_current: [],
    chord_difficulty: 1,
    chord_game: null,
    chord_rows: [],
    current_guess: [],
    free_mode: "fall",
    game: null,
    locked: false,
    melody_idx: -1,
    mode: "melody"
};

// Letter key → white note mapping
const KEY_NOTES = {
    "a": "C",
    "d": "E",
    "f": "F",
    "g": "G",
    "h": "A",
    "j": "B",
    "k": "C2",
    "s": "D"
};

// Letter key → sharp note mapping (chord mode difficulties 3 and 4 only)
const SHARP_KEYS = {
    "e": "D#",
    "t": "F#",
    "u": "A#",
    "w": "C#",
    "y": "G#"
};

// Extra keys — free play mode only (second octave extension)
const FREE_EXTRA_KEYS = {
    ";": "E2",
    "l": "D2",
    "o": "C#2",
    "p": "D#2"
};

// Note → key letter (reverse lookups for on-key labels)
const NOTE_NUMBERS = Object.fromEntries(
    Object.entries(KEY_NOTES).map(function (entry) {
        return [entry[1], entry[0]];
    })
);
const SHARP_NOTE_KEYS = Object.fromEntries(
    Object.entries(SHARP_KEYS).map(function (entry) {
        return [entry[1], entry[0]];
    })
);

// ── Utility helpers ──────────────────────────────────────────────────────────
function remove_at(arr, idx) {
    return arr.slice(0, idx).concat(arr.slice(idx + 1));
}

function pick_different_idx(arr_length, current) {
    if (current < 0) {
        return Math.floor(Math.random() * arr_length);
    }
    if (arr_length <= 1) {
        return 0;
    }
    const i = Math.floor(Math.random() * (arr_length - 1));
    return (
        i >= current
        ? i + 1
        : i
    );
}

// ── Melody timeouts ──────────────────────────────────────────────────────────
let melody_timeouts = [];

function clear_melody_timeouts() {
    melody_timeouts.forEach(clearTimeout);
    melody_timeouts = [];
}

function play_melody_sequence(notes, on_done) {
    clear_melody_timeouts();
    const NOTE_DUR = 900;
    notes.forEach(function (note, i) {
        melody_timeouts.push(
            setTimeout(function () {
                play_note(note);
            }, i * NOTE_DUR)
        );
    });
    melody_timeouts.push(
        setTimeout(on_done, notes.length * NOTE_DUR + 400)
    );
}

function set_keyboard_enabled(enabled) {
    const kb = document.getElementById("piano-keyboard");
    kb.classList.toggle("keyboard--disabled", !enabled);
}

// ── DOM helpers ──────────────────────────────────────────────────────────────
function el(tag, cls, attrs) {
    const node = document.createElement(tag);
    if (cls) {
        (
            Array.isArray(cls)
            ? cls
            : [cls]
        ).forEach(function (c) {
            if (c) {
                node.classList.add(c);
            }
        });
    }
    if (attrs) {
        Object.keys(attrs).forEach(function (k) {
            const v = attrs[k];
            if (k === "text") {
                node.textContent = v;
            } else {
                node.setAttribute(k, v);
            }
        });
    }
    return node;
}

function set_slot_colour(slot_el, note) {
    let lbl = slot_el.querySelector(".slot-label");
    if (!lbl) {
        lbl = el("span", "slot-label", {"aria-hidden": "true"});
        slot_el.appendChild(lbl);
    }
    if (note) {
        slot_el.dataset.note = note;
        slot_el.classList.add("slot--filled");
        slot_el.setAttribute(
            "aria-label",
            "Note " + note + " — click to remove"
        );
        lbl.textContent = note;
    } else {
        delete slot_el.dataset.note;
        slot_el.classList.remove("slot--filled");
        slot_el.setAttribute("aria-label", "Empty slot");
        lbl.textContent = "";
    }
}

// ── Physics (free play collect mode) ─────────────────────────────────────────
const CIRCLE_R = 20;
const PHYS_H = 425;
const PHYS_W = 1392;

let phys_bodies = [];
let phys_engine = null;
let phys_raf = null;
let phys_runner = null;

function phys_tick() {
    phys_raf = requestAnimationFrame(phys_tick);
    phys_bodies.forEach(function (item) {
        const p = item.body.position;
        item.el.style.left = (p.x - CIRCLE_R) + "px";
        item.el.style.top = (p.y - CIRCLE_R) + "px";
    });
}

function phys_start() {
    if (phys_engine) {
        return;
    }
    phys_engine = Matter.Engine.create({gravity: {y: 0.04}});

    const B = Matter.Bodies;
    Matter.Composite.add(phys_engine.world, [
        B.rectangle(
            PHYS_W / 2,
            PHYS_H + 25,
            PHYS_W + 200,
            50,
            {isStatic: true}
        ),
        B.rectangle(
            -25,
            PHYS_H / 2,
            50,
            PHYS_H * 3,
            {isStatic: true}
        ),
        B.rectangle(
            PHYS_W + 25,
            PHYS_H / 2,
            50,
            PHYS_H * 3,
            {isStatic: true}
        )
    ]);

    phys_runner = Matter.Runner.create();
    Matter.Runner.run(phys_runner, phys_engine);
    phys_tick();
}

function phys_stop() {
    if (phys_raf) {
        cancelAnimationFrame(phys_raf);
        phys_raf = null;
    }
    if (phys_runner) {
        Matter.Runner.stop(phys_runner);
        phys_runner = null;
    }
    if (phys_engine) {
        Matter.Engine.clear(phys_engine);
        phys_engine = null;
    }
    phys_bodies = [];
}

function phys_add_circle(note, canvas) {
    const x = CIRCLE_R + Math.random() * (PHYS_W - 2 * CIRCLE_R);
    const body = Matter.Bodies.circle(x, CIRCLE_R, CIRCLE_R, {
        density: 0.002,
        friction: 0.6,
        frictionAir: 0.01,
        restitution: 0.35
    });
    Matter.Composite.add(phys_engine.world, body);

    const div = el("div", ["free-circle", "free-circle--physics"]);
    div.dataset.note = note;
    div.style.left = (x - CIRCLE_R) + "px";
    canvas.appendChild(div);
    phys_bodies.push({body, el: div});
}

// ── Status and UI helpers ────────────────────────────────────────────────────
function set_status(msg) {
    document.getElementById("status-message").textContent = msg;
}

function highlight_active_row() {
    ui.board_rows.forEach(function (r, i) {
        r.row.classList.toggle(
            "guess-column--active",
            i === ui.active_row
        );
    });
}

function render_current_slots() {
    if (ui.active_row >= MAX_ATTEMPTS) {
        return;
    }
    const row_obj = ui.board_rows[ui.active_row];
    const clen = get_code_length();
    Array.from(new Array(clen).keys()).forEach(function (s) {
        set_slot_colour(
            row_obj.slot_els[s],
            ui.current_guess[s] || null
        );
    });
}

// ── Key press visuals and free-play circles ──────────────────────────────────
function press_key(note) {
    const key_el = document.querySelector(
        "#piano-keyboard [data-note=\"" + note + "\"]"
    );
    if (key_el) {
        key_el.classList.add("key-pressed");
    }
}

function release_key(note) {
    const key_el = document.querySelector(
        "#piano-keyboard [data-note=\"" + note + "\"]"
    );
    if (key_el) {
        key_el.classList.remove("key-pressed");
    }
}

function spawn_free_circle(note) {
    const canvas = document.getElementById("free-play-canvas");
    if (!canvas || canvas.hasAttribute("hidden")) {
        return;
    }

    if (ui.free_mode === "collect") {
        if (!phys_engine) {
            phys_start();
        }
        phys_add_circle(note, canvas);
    } else {
        const cw = canvas.offsetWidth || PHYS_W;
        const ch = canvas.offsetHeight || PHYS_H;
        const x = CIRCLE_R + Math.random() * Math.max(
            0,
            cw - 2 * CIRCLE_R
        );
        const y = CIRCLE_R + Math.random() * Math.max(
            0,
            ch - 2 * CIRCLE_R - 70
        );
        const circle = el("div", "free-circle");
        circle.dataset.note = note;
        circle.style.left = (x - CIRCLE_R) + "px";
        circle.style.top = (y - CIRCLE_R) + "px";
        canvas.appendChild(circle);
        setTimeout(function () {
            if (circle.parentNode) {
                circle.remove();
            }
        }, 1200);
    }
}

// ── Keyboard builder ─────────────────────────────────────────────────────────
function build_keyboard(keyboard_el, on_note) {
    keyboard_el.innerHTML = "";

    const white_notes = ["C", "D", "E", "F", "G", "A", "B", "C2"];
    const black_notes = ["C#", "D#", "F#", "G#", "A#"];

    white_notes.forEach(function (note) {
        const wrapper = el("div", "key-wrapper");
        const key = el("button", "piano-key", {
            "aria-label": "Note " + note,
            "data-note": note,
            "type": "button"
        });
        const img = el("img", "key-img", {
            "alt": "",
            "aria-hidden": "true",
            "draggable": "false",
            "src": "images/" + note.toLowerCase() + ".svg"
        });
        key.appendChild(img);
        key.addEventListener("click", function () {
            play_note(note);
            on_note(note);
        });
        wrapper.appendChild(key);
        const num = el("span", "key-number", {"aria-hidden": "true"});
        num.textContent = NOTE_NUMBERS[note] || "";
        wrapper.appendChild(num);
        keyboard_el.appendChild(wrapper);
    });

    black_notes.forEach(function (note) {
        const shadow = el("div", "black-key-shadow");
        shadow.dataset.note = note;
        keyboard_el.appendChild(shadow);

        const bkey = el("button", "black-key-btn", {
            "aria-label": "Note " + note,
            "data-note": note,
            "type": "button"
        });
        const band = el("div", "black-key-color-band");
        band.dataset.note = note;
        bkey.appendChild(band);
        const note_lbl = el(
            "span",
            "black-key-note",
            {"aria-hidden": "true"}
        );
        note_lbl.textContent = note;
        bkey.appendChild(note_lbl);
        const ltr = el(
            "span",
            "black-key-shortcut",
            {"aria-hidden": "true"}
        );
        ltr.textContent = SHARP_NOTE_KEYS[note] || "";
        bkey.appendChild(ltr);
        bkey.addEventListener("click", function () {
            play_note(note);
            on_note(note);
        });
        keyboard_el.appendChild(bkey);
    });

    // Decorative key and shadow (rightmost, no note — position via CSS)
    keyboard_el.appendChild(el("div", "black-key-shadow"));
    keyboard_el.appendChild(el("div", "black-key"));
}

// ── Board builder (guess columns) ────────────────────────────────────────────
function build_board(board_el, code_length) {
    board_el.innerHTML = "";
    const rows = [];
    const is_long = code_length === 6;

    Array.from(new Array(MAX_ATTEMPTS).keys()).forEach(function (i) {
        const col = el(
            "div",
            [
                "guess-column",
                (
                    is_long
                    ? "guess-column--long"
                    : null
                )
            ]
        );

        const slot_els = [];
        Array.from(new Array(code_length).keys()).forEach(function (s) {
            const slot = el("button", "slot", {
                "aria-label": "Empty slot",
                "type": "button"
            });
            slot.addEventListener("click", function () {
                on_slot_click(i, s);
            });
            col.appendChild(slot);
            slot_els.push(slot);
        });

        const peg_grid = el(
            "div",
            "peg-grid",
            {"aria-label": "Feedback pegs"}
        );
        const peg_els = [];
        Array.from(new Array(code_length).keys()).forEach(function () {
            const peg = el("span", "peg");
            peg_grid.appendChild(peg);
            peg_els.push(peg);
        });
        col.appendChild(peg_grid);
        board_el.appendChild(col);
        rows.push({peg_els, row: col, slot_els});
    });
    return rows;
}

// ── Chord board builder ──────────────────────────────────────────────────────
function build_chord_board(board_el, note_count) {
    board_el.innerHTML = "";
    const rows = [];
    const BIG_R = 66;
    const SMALL_R = 22;
    const ORBIT_R = BIG_R - SMALL_R - 5;

    Array.from(new Array(CHORD_MAX_ATTEMPTS).keys()).forEach(function (i) {
        const big = el("div", "chord-circle");

        const small_els = [];
        Array.from(new Array(note_count).keys()).forEach(function (s) {
            const angle = (
                (2 * Math.PI * s / note_count) - Math.PI / 2
            );
            const sx = BIG_R + ORBIT_R * Math.cos(angle) - SMALL_R;
            const sy = BIG_R + ORBIT_R * Math.sin(angle) - SMALL_R;
            const ri = i;
            const si = s;
            const small = el("button", "chord-note-circle", {
                "aria-label": "Empty chord slot",
                "type": "button"
            });
            small.style.left = sx + "px";
            small.style.top = sy + "px";
            const lbl = el("span", "slot-label", {"aria-hidden": "true"});
            small.appendChild(lbl);
            small.addEventListener("click", function () {
                on_chord_slot_click(ri, si);
            });
            big.appendChild(small);
            small_els.push(small);
        });

        board_el.appendChild(big);
        rows.push({big, small_els});
    });
    rows[0].big.classList.add("chord-circle--active");
    return rows;
}

// ── Render helpers ───────────────────────────────────────────────────────────
function render_attempt(row_obj, attempt) {
    attempt.guess.forEach(function (note, i) {
        set_slot_colour(row_obj.slot_els[i], note);
        row_obj.slot_els[i].disabled = true;
        row_obj.slot_els[i].setAttribute("aria-label", "Note " + note);
    });

    row_obj.peg_els.forEach(function (peg, i) {
        peg.classList.remove("peg--green", "peg--red");
        if (attempt.feedback[i] === "green") {
            peg.classList.add("peg--green");
            peg.setAttribute("aria-label", "Correct position");
        } else if (attempt.feedback[i] === "red") {
            peg.classList.add("peg--red");
            peg.setAttribute(
                "aria-label",
                "Note present, wrong position"
            );
        } else {
            peg.setAttribute("aria-label", "Note not in secret");
        }
    });
    row_obj.row.classList.remove("guess-column--active");
}

function render_chord_current() {
    const row = ui.chord_rows[ui.chord_active_row];
    if (!row) {
        return;
    }
    row.small_els.forEach(function (s, i) {
        const note = ui.chord_current[i];
        const lbl = s.querySelector(".slot-label");
        if (note) {
            s.dataset.note = note;
            s.classList.add("chord-note-circle--filled");
            s.setAttribute(
                "aria-label",
                "Note " + note + " — click to remove"
            );
            if (lbl) {
                lbl.textContent = note;
            }
        } else {
            delete s.dataset.note;
            s.classList.remove("chord-note-circle--filled");
            s.setAttribute("aria-label", "Empty chord slot");
            if (lbl) {
                lbl.textContent = "";
            }
        }
    });
}

// ── Note event handlers ──────────────────────────────────────────────────────
function on_note(note) {
    if (ui.locked) {
        return;
    }
    if (ui.mode === "chord") {
        on_chord_note(note);
        return;
    }
    if (ui.mode === "free") {
        spawn_free_circle(note);
        return;
    }
    if (is_over(ui.game)) {
        return;
    }
    const clen = get_code_length();
    if (ui.current_guess.length >= clen) {
        return;
    }

    ui.current_guess = ui.current_guess.concat([note]);
    render_current_slots();
    set_status(
        "Added " + note + ". " +
        (clen - ui.current_guess.length) + " more needed."
    );

    if (ui.current_guess.length === clen) {
        submit_guess();
    }
}

function on_slot_click(row_idx, slot_idx) {
    if (ui.locked || row_idx !== ui.active_row) {
        return;
    }
    if (is_over(ui.game)) {
        return;
    }
    if (slot_idx >= ui.current_guess.length) {
        return;
    }
    ui.current_guess = remove_at(ui.current_guess, slot_idx);
    render_current_slots();
    set_status(
        "Note removed. " +
        (get_code_length() - ui.current_guess.length) + " more needed."
    );
}

function on_chord_note(note) {
    if (chord_is_over(ui.chord_game)) {
        return;
    }
    const count = CHORD_DIFFICULTY_SETTINGS[
        ui.chord_difficulty - 1
    ].count;
    const idx = ui.chord_current.indexOf(note);
    if (idx !== -1) {
        ui.chord_current = remove_at(ui.chord_current, idx);
    } else {
        if (ui.chord_current.length >= count) {
            return;
        }
        ui.chord_current = ui.chord_current.concat([note]);
    }
    render_chord_current();
    if (ui.chord_current.length === count) {
        submit_chord_guess();
    }
}

function on_chord_slot_click(row_idx, slot_idx) {
    if (ui.locked || row_idx !== ui.chord_active_row) {
        return;
    }
    if (chord_is_over(ui.chord_game)) {
        return;
    }
    if (slot_idx >= ui.chord_current.length) {
        return;
    }
    ui.chord_current = remove_at(ui.chord_current, slot_idx);
    render_chord_current();
}

// ── Submit handlers ──────────────────────────────────────────────────────────
function submit_guess() {
    const attempt_idx = ui.active_row;
    ui.game = make_guess(ui.current_guess.slice(), ui.game);

    const attempt = get_attempts(ui.game)[attempt_idx];
    render_attempt(ui.board_rows[attempt_idx], attempt);

    ui.current_guess = [];
    ui.active_row += 1;

    if (is_won(ui.game)) {
        show_game_over(true);
    } else if (is_lost(ui.game)) {
        show_game_over(false);
    } else {
        highlight_active_row();
        const greens = attempt.feedback.filter(function (c) {
            return c === "green";
        }).length;
        const reds = attempt.feedback.filter(function (c) {
            return c === "red";
        }).length;
        set_status(
            greens + " green, " + reds +
            " red. " +
            get_remaining_attempts(ui.game) + " attempts left."
        );
    }
}

function submit_chord_guess() {
    ui.chord_game = make_chord_guess(
        ui.chord_current.slice(),
        ui.chord_game
    );
    const last = ui.chord_game.attempts[
        ui.chord_game.attempts.length - 1
    ];
    const guess = last.guess;
    const feedback = last.feedback;

    const row = ui.chord_rows[ui.chord_active_row];
    row.big.classList.remove("chord-circle--active");
    row.big.classList.add("chord-circle--done");
    guess.forEach(function (note, i) {
        const s = row.small_els[i];
        s.dataset.note = note;
        s.classList.add("chord-note-circle--filled");
        s.setAttribute(
            "aria-label",
            "Note " + note + (
                feedback[i] === "green"
                ? " — correct"
                : " — not in chord"
            )
        );
        if (feedback[i] === "green") {
            s.classList.add("chord-note-circle--correct");
        } else {
            s.classList.add("chord-note-circle--wrong");
        }
    });

    ui.chord_current = [];
    ui.chord_active_row += 1;

    if (chord_is_won(ui.chord_game)) {
        show_chord_game_over(true);
    } else if (chord_is_lost(ui.chord_game)) {
        show_chord_game_over(false);
    } else if (ui.chord_active_row < CHORD_MAX_ATTEMPTS) {
        ui.chord_rows[ui.chord_active_row].big.classList.add(
            "chord-circle--active"
        );
    }
}

// ── Game-over overlays ───────────────────────────────────────────────────────
function stop_youtube() {
    document.getElementById("btn-listen").setAttribute("hidden", "");
}

function show_game_over(won) {
    const is_pp = ui.mode === "perfect_pitch";
    const melody = (
        (ui.mode === "melody" && ui.melody_idx >= 0)
        ? MELODIES[ui.melody_idx]
        : (
            (is_pp && ui.melody_idx >= 0)
            ? PERFECT_PITCH_MELODIES[ui.melody_idx]
            : null
        )
    );

    const desc_el = document.getElementById("gameover-desc");

    if (won) {
        document.getElementById("gameover-title").textContent = (
            is_pp
            ? "You replicated it!"
            : (
                melody
                ? "Well done!"
                : "You cracked it!"
            )
        );
        if (melody) {
            document.getElementById("gameover-body").textContent = (
                is_pp
                ? "That was"
                : "Did you know that this is actually"
            );
            desc_el.textContent = melody.description;
            desc_el.removeAttribute("hidden");
        } else {
            document.getElementById("gameover-body").textContent = (
                "You guessed in " + get_attempt_count(ui.game) +
                " attempt" +
                (
                    get_attempt_count(ui.game) === 1
                    ? ""
                    : "s"
                ) + "."
            );
            desc_el.setAttribute("hidden", "");
        }
    } else {
        document.getElementById("gameover-title").textContent = "Game over!";
        if (melody) {
            document.getElementById("gameover-body").textContent = (
                is_pp
                ? "The melody was"
                : "The secret melody was"
            );
            desc_el.textContent = melody.description;
            desc_el.removeAttribute("hidden");
        } else {
            document.getElementById(
                "gameover-body"
            ).textContent = "The secret code was:";
            desc_el.setAttribute("hidden", "");
        }
    }

    const btn_listen = document.getElementById("btn-listen");
    if (ui.mode === "melody" && melody && melody.youtube) {
        btn_listen.removeAttribute("hidden");
        btn_listen.dataset.youtube = melody.youtube;
    } else {
        btn_listen.setAttribute("hidden", "");
    }

    const reveal = document.getElementById("secret-reveal");
    reveal.innerHTML = "";
    get_secret(ui.game).forEach(function (note) {
        const s = el("button", "slot", {
            "aria-label": "Note " + note,
            "disabled": "true",
            "type": "button"
        });
        s.dataset.note = note;
        s.classList.add("slot--filled");
        const lbl = el("span", "slot-label", {"aria-hidden": "true"});
        lbl.textContent = note;
        s.appendChild(lbl);
        reveal.appendChild(s);
    });

    document.getElementById(
        "btn-hear-again"
    ).setAttribute("hidden", "");
    document.getElementById(
        "overlay-gameover"
    ).removeAttribute("hidden");
    document.getElementById("btn-play-again").focus();
    set_status(
        won
        ? "Congratulations — you won!"
        : "Game over."
    );
}

function show_chord_game_over(won) {
    document.getElementById("btn-hear-again").setAttribute("hidden", "");
    const attempts = ui.chord_game.attempts.length;
    document.getElementById("gameover-title").textContent = (
        won
        ? "You got the chord!"
        : "Game over!"
    );
    document.getElementById("gameover-body").textContent = (
        won
        ? ("Found in " + attempts + (
            attempts === 1
            ? " try!"
            : " tries!"
        ))
        : "The chord was:"
    );
    document.getElementById("gameover-desc").setAttribute("hidden", "");
    document.getElementById("btn-listen").setAttribute("hidden", "");

    const reveal = document.getElementById("secret-reveal");
    reveal.innerHTML = "";
    ui.chord_game.secret.forEach(function (note) {
        const s = el("button", "slot", {
            "aria-label": "Note " + note,
            "disabled": "true",
            "type": "button"
        });
        s.dataset.note = note;
        s.classList.add("slot--filled");
        const lbl = el("span", "slot-label", {"aria-hidden": "true"});
        lbl.textContent = note;
        s.appendChild(lbl);
        reveal.appendChild(s);
    });

    document.getElementById("overlay-gameover").removeAttribute("hidden");
    document.getElementById("btn-play-again").focus();
    set_status(
        won
        ? "You got the chord!"
        : "Game over."
    );
}

// ── Mode helpers ─────────────────────────────────────────────────────────────
function get_code_length() {
    return (
        ui.mode === "perfect_pitch"
        ? 6
        : 4
    );
}

// ── Start game functions ─────────────────────────────────────────────────────
function start_chord_game() {
    const settings = CHORD_DIFFICULTY_SETTINGS[ui.chord_difficulty - 1];
    ui.chord_game = create_chord_game(
        random_chord_secret(Math.random, settings.count, settings.pool)
    );
    ui.chord_current = [];
    ui.chord_active_row = 0;

    const kb = document.getElementById("piano-keyboard");
    kb.classList.toggle(
        "keyboard--chord",
        settings.pool === CHORD_NOTES_ALL
    );

    const board_el = document.getElementById("guess-board");
    ui.chord_rows = build_chord_board(board_el, settings.count);

    document.getElementById(
        "overlay-gameover"
    ).setAttribute("hidden", "");
    document.getElementById(
        "overlay-howto"
    ).setAttribute("hidden", "");
    document.getElementById(
        "btn-hear-again"
    ).setAttribute("hidden", "");

    ui.locked = true;
    set_keyboard_enabled(false);
    const listen_overlay = document.getElementById("overlay-listen");
    listen_overlay.querySelector(
        ".listen-prompt"
    ).textContent = "get ready...";
    listen_overlay.querySelector(".listen-sub").textContent = "";
    listen_overlay.removeAttribute("hidden");
    document.getElementById("btn-cancel-listen").focus();
    Tone.start();

    melody_timeouts.push(setTimeout(function () {
        if (listen_overlay.hasAttribute("hidden")) {
            return;
        }
        const count = settings.count;
        listen_overlay.querySelector(
            ".listen-prompt"
        ).textContent = "listen carefully...";
        listen_overlay.querySelector(
            ".listen-sub"
        ).textContent = "identify these " + count + " notes";
        ui.chord_game.secret.forEach(function (note) {
            play_note(note);
        });
        melody_timeouts.push(setTimeout(function () {
            if (listen_overlay.hasAttribute("hidden")) {
                return;
            }
            listen_overlay.setAttribute("hidden", "");
            ui.locked = false;
            set_keyboard_enabled(true);
            const hear_btn = document.getElementById("btn-hear-again");
            hear_btn.setAttribute(
                "aria-label",
                "Hear the chord again"
            );
            hear_btn.removeAttribute("hidden");
            set_status(
                "Chord mode — identify all " + count +
                " notes in " + CHORD_MAX_ATTEMPTS + " tries!"
            );
        }, 1800));
    }, 2000));
}

function start_new_game() {
    clear_melody_timeouts();
    phys_stop();
    document.getElementById(
        "overlay-listen"
    ).setAttribute("hidden", "");
    document.getElementById(
        "free-play-canvas"
    ).setAttribute("hidden", "");
    document.getElementById(
        "free-play-controls"
    ).setAttribute("hidden", "");
    ui.locked = false;
    set_keyboard_enabled(true);
    document.getElementById(
        "piano-keyboard"
    ).classList.remove("keyboard--chord");

    if (ui.mode === "chord") {
        start_chord_game();
        return;
    }

    if (ui.mode === "free") {
        document.getElementById("guess-board").innerHTML = "";
        document.getElementById(
            "overlay-gameover"
        ).setAttribute("hidden", "");
        document.getElementById(
            "overlay-howto"
        ).setAttribute("hidden", "");
        document.getElementById(
            "btn-hear-again"
        ).setAttribute("hidden", "");
        document.getElementById(
            "piano-keyboard"
        ).classList.add("keyboard--chord");
        const canvas = document.getElementById("free-play-canvas");
        canvas.innerHTML = "";
        canvas.removeAttribute("hidden");
        document.getElementById(
            "free-play-controls"
        ).removeAttribute("hidden");
        if (ui.free_mode === "collect") {
            phys_start();
        }
        set_status("Free play — press any key to play notes!");
        return;
    }

    ui.game = null;
    let secret;
    if (ui.mode === "melody") {
        ui.melody_idx = pick_different_idx(
            MELODIES.length,
            ui.melody_idx
        );
        secret = MELODIES[ui.melody_idx].code.slice();
    } else if (ui.mode === "perfect_pitch") {
        ui.melody_idx = pick_different_idx(
            PERFECT_PITCH_MELODIES.length,
            ui.melody_idx
        );
        secret = PERFECT_PITCH_MELODIES[ui.melody_idx].code.slice();
    } else {
        ui.melody_idx = -1;
        secret = random_secret(Math.random, NOTES);
    }

    ui.game = create_game(secret);
    ui.current_guess = [];
    ui.active_row = 0;

    const board_el = document.getElementById("guess-board");
    ui.board_rows = build_board(board_el, secret.length);
    highlight_active_row();

    document.getElementById(
        "overlay-gameover"
    ).setAttribute("hidden", "");
    document.getElementById(
        "overlay-howto"
    ).setAttribute("hidden", "");
    document.getElementById(
        "btn-hear-again"
    ).setAttribute("hidden", "");

    if (ui.mode === "perfect_pitch") {
        ui.locked = true;
        set_keyboard_enabled(false);
        const listen_overlay = document.getElementById("overlay-listen");
        listen_overlay.querySelector(
            ".listen-prompt"
        ).textContent = "get ready...";
        listen_overlay.querySelector(".listen-sub").textContent = "";
        listen_overlay.removeAttribute("hidden");
        document.getElementById("btn-cancel-listen").focus();
        Tone.start();
        melody_timeouts.push(setTimeout(function () {
            if (listen_overlay.hasAttribute("hidden")) {
                return;
            }
            listen_overlay.querySelector(
                ".listen-prompt"
            ).textContent = "listen carefully...";
            listen_overlay.querySelector(
                ".listen-sub"
            ).textContent = "try and replay this melody on the piano";
            play_melody_sequence(secret, function () {
                listen_overlay.setAttribute("hidden", "");
                ui.locked = false;
                set_keyboard_enabled(true);
                const hear_pp = document.getElementById(
                    "btn-hear-again"
                );
                hear_pp.setAttribute(
                    "aria-label",
                    "Hear the melody again"
                );
                hear_pp.removeAttribute("hidden");
                set_status("Now try to replay those 6 notes!");
            });
        }, 2000));
    } else {
        set_status(
            ui.mode === "melody"
            ? "Melody mode — guess the 4-note tune!"
            : "Click piano keys to build your 4-note guess."
        );
    }
}

// ── Responsive scaling — JS computes ratio, CSS var applies it ───────────────
function resize_game() {
    const scale = Math.min(
        window.innerWidth / 1512,
        window.innerHeight / 982
    );
    document.documentElement.style.setProperty(
        "--game-scale",
        String(scale)
    );
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {

    init_piano();

    ["btn-a11y", "btn-how-to-play", "btn-mode", "btn-new-game"].forEach(
        function (id) {
            document.getElementById(id).addEventListener(
                "click",
                function () {
                    play_click_for(id);
                }
            );
        }
    );

    build_keyboard(document.getElementById("piano-keyboard"), on_note);

    document.getElementById("btn-new-game").addEventListener(
        "click",
        function () {
            stop_youtube();
            start_new_game();
        }
    );
    document.getElementById("btn-play-again").addEventListener(
        "click",
        function () {
            stop_youtube();
            start_new_game();
        }
    );

    function update_mode_button(btn) {
        const labels = {
            chord: "chord mode",
            free: "free play",
            melody: "melody mode",
            perfect_pitch: "perfect pitch",
            random: "random mode"
        };
        btn.textContent = labels[ui.mode];
        btn.classList.toggle(
            "pill-btn--mode-active",
            ui.mode !== "random"
        );
        const modes = [
            "random", "melody", "perfect_pitch", "chord", "free"
        ];
        document.querySelectorAll(".mode-dot").forEach(
            function (dot, i) {
                dot.classList.toggle(
                    "mode-dot--active",
                    modes[i] === ui.mode
                );
            }
        );
        const diff_el = document.getElementById("chord-difficulty");
        if (ui.mode === "chord") {
            diff_el.removeAttribute("hidden");
        } else {
            diff_el.setAttribute("hidden", "");
        }
        document.getElementById(
            "btn-hear-again"
        ).setAttribute("hidden", "");
    }

    document.getElementById("btn-mode").addEventListener(
        "click",
        function (e) {
            if (ui.mode === "random") {
                ui.mode = "melody";
            } else if (ui.mode === "melody") {
                ui.mode = "perfect_pitch";
            } else if (ui.mode === "perfect_pitch") {
                ui.mode = "chord";
            } else if (ui.mode === "chord") {
                ui.mode = "free";
            } else {
                ui.mode = "random";
            }
            update_mode_button(e.currentTarget);
            stop_youtube();
            start_new_game();
        }
    );

    document.getElementById("btn-listen").addEventListener(
        "click",
        function (e) {
            const video_id = e.currentTarget.dataset.youtube;
            window.open(
                "https://www.youtube.com/watch?v=" + video_id,
                "_blank",
                "noopener,noreferrer"
            );
        }
    );

    document.getElementById("btn-how-to-play").addEventListener(
        "click",
        function () {
            document.getElementById(
                "overlay-howto"
            ).removeAttribute("hidden");
            document.getElementById("btn-close-howto").focus();
        }
    );
    document.getElementById("btn-close-howto").addEventListener(
        "click",
        function () {
            document.getElementById(
                "overlay-howto"
            ).setAttribute("hidden", "");
            document.getElementById("btn-how-to-play").focus();
        }
    );

    document.getElementById("btn-hear-again").addEventListener(
        "click",
        function (e) {
            if (ui.locked) {
                return;
            }
            const btn = e.currentTarget;
            if (ui.mode === "chord") {
                if (chord_is_over(ui.chord_game)) {
                    return;
                }
                ui.locked = true;
                btn.disabled = true;
                set_keyboard_enabled(false);
                ui.chord_game.secret.forEach(function (note) {
                    play_note(note);
                });
                melody_timeouts.push(setTimeout(function () {
                    ui.locked = false;
                    btn.disabled = false;
                    set_keyboard_enabled(true);
                }, 1400));
            } else {
                if (!ui.game || is_over(ui.game)) {
                    return;
                }
                ui.locked = true;
                btn.disabled = true;
                set_keyboard_enabled(false);
                play_melody_sequence(get_secret(ui.game), function () {
                    ui.locked = false;
                    btn.disabled = false;
                    set_keyboard_enabled(true);
                });
            }
        }
    );

    document.getElementById("btn-cancel-listen").addEventListener(
        "click",
        function () {
            clear_melody_timeouts();
            document.getElementById(
                "overlay-listen"
            ).setAttribute("hidden", "");
            ui.locked = false;
            set_keyboard_enabled(true);
            if (
                ui.mode === "perfect_pitch" ||
                ui.mode === "chord"
            ) {
                const hear_restart = document.getElementById(
                    "btn-hear-again"
                );
                hear_restart.setAttribute(
                    "aria-label",
                    (
                        ui.mode === "chord"
                        ? "Hear the chord again"
                        : "Hear the melody again"
                    )
                );
                hear_restart.removeAttribute("hidden");
                set_status(
                    "Use the \"hear it again\" button when you're ready."
                );
            }
        }
    );

    document.querySelectorAll(".difficulty-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            const d = parseInt(e.currentTarget.dataset.difficulty, 10);
            ui.chord_difficulty = d;
            document.querySelectorAll(".difficulty-btn").forEach(
                function (b) {
                    b.classList.toggle(
                        "difficulty-btn--active",
                        parseInt(b.dataset.difficulty, 10) === d
                    );
                }
            );
            start_new_game();
        });
    });

    document.getElementById("btn-a11y").addEventListener(
        "click",
        function (e) {
            ui.a11y = !ui.a11y;
            document.getElementById(
                "game-container"
            ).classList.toggle("a11y-mode", ui.a11y);
            e.currentTarget.classList.toggle(
                "a11y-btn--active",
                ui.a11y
            );
            e.currentTarget.setAttribute(
                "aria-pressed",
                String(ui.a11y)
            );
            set_status(
                ui.a11y
                ? "Accessibility mode on."
                : "Accessibility mode off."
            );
        }
    );

    ["overlay-gameover", "overlay-howto"].forEach(function (id) {
        document.getElementById(id).addEventListener(
            "click",
            function (e) {
                if (e.target === e.currentTarget) {
                    e.currentTarget.setAttribute("hidden", "");
                }
            }
        );
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            document.getElementById(
                "overlay-howto"
            ).setAttribute("hidden", "");
            document.getElementById(
                "overlay-gameover"
            ).setAttribute("hidden", "");
            stop_youtube();
        }
        if (e.key === "Backspace" || e.key === "Delete") {
            if (
                ui.mode === "chord" &&
                !chord_is_over(ui.chord_game) &&
                ui.chord_current.length > 0
            ) {
                ui.chord_current = ui.chord_current.slice(0, -1);
                render_chord_current();
            } else if (
                ui.mode !== "chord" &&
                ui.game &&
                !is_over(ui.game) &&
                ui.current_guess.length > 0
            ) {
                ui.current_guess = ui.current_guess.slice(0, -1);
                render_current_slots();
                set_status(
                    "Note removed. " +
                    (
                        get_code_length() - ui.current_guess.length
                    ) + " more needed."
                );
            }
        }
        if (e.repeat) {
            return;
        }
        const note = KEY_NOTES[e.key];
        const game_active = (
            ui.mode === "chord"
            ? !chord_is_over(ui.chord_game)
            : (
                ui.mode === "free"
                ? true
                : (ui.game && !is_over(ui.game))
            )
        );
        if (note && !ui.locked && game_active) {
            play_note(note);
            on_note(note);
            press_key(note);
        }
        const sharps_enabled = (
            ui.mode === "free" ||
            (
                ui.mode === "chord" &&
                CHORD_DIFFICULTY_SETTINGS[
                    ui.chord_difficulty - 1
                ].pool === CHORD_NOTES_ALL
            )
        );
        if (sharps_enabled) {
            const sharp_note = SHARP_KEYS[e.key];
            const sharp_ok = (
                ui.mode === "free" ||
                !chord_is_over(ui.chord_game)
            );
            if (sharp_note && !ui.locked && sharp_ok) {
                play_note(sharp_note);
                on_note(sharp_note);
                press_key(sharp_note);
            }
        }
        if (ui.mode === "free" && !ui.locked) {
            const extra_note = FREE_EXTRA_KEYS[e.key];
            if (extra_note) {
                play_note(extra_note);
                on_note(extra_note);
            }
        }
    });

    document.querySelectorAll(".free-toggle-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            const prev = ui.free_mode;
            ui.free_mode = e.currentTarget.dataset.freeMode;
            document.querySelectorAll(".free-toggle-btn").forEach(
                function (b) {
                    b.classList.toggle(
                        "free-toggle-btn--active",
                        b.dataset.freeMode === ui.free_mode
                    );
                }
            );
            const canvas = document.getElementById("free-play-canvas");
            if (ui.free_mode === "collect" && prev !== "collect") {
                if (canvas) {
                    canvas.innerHTML = "";
                }
                phys_start();
            } else if (
                ui.free_mode !== "collect" &&
                prev === "collect"
            ) {
                phys_stop();
                if (canvas) {
                    canvas.innerHTML = "";
                }
            }
        });
    });

    document.addEventListener("keyup", function (e) {
        const note = KEY_NOTES[e.key];
        if (note) {
            release_key(note);
        }
        const sharp_note = SHARP_KEYS[e.key];
        if (sharp_note) {
            release_key(sharp_note);
        }
    });

    window.addEventListener("resize", resize_game);
    resize_game();

    update_mode_button(document.getElementById("btn-mode"));

    start_new_game();
});
