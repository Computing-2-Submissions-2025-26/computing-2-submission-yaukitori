/**
 * @module Mastermind
 */

import R from "./ramda.js";

// ── Type definitions ──
/**
 * One of the playable note strings, e.g. "C", "D", … "C2".
 * @typedef {string} Note
 */

/**
 * An array of {@link Note} values forming the hidden code.
 * @typedef {Note[]} Secret
 */

/**
 * An array of {@link Note} values forming one player attempt.
 * @typedef {Note[]} Guess
 */

/**
 * The result of scoring a guess - counts of correct and misplaced notes.
 * @typedef {Object} Feedback
 * @property {number} greens - Notes correct in both value and position.
 * @property {number} reds   - Notes present in the secret but in the
 *     wrong position.
 */

/**
 * Per-position peg colour: "green" (right note, right place),
 * "red" (right note, wrong place), or "empty" (note absent from secret).
 * @typedef {"green"|"red"|"empty"} PegColour
 */

/**
 * A single recorded attempt, pairing the guess with its feedback.
 * @typedef {Object} Attempt
 * @property {Guess}       guess    - The notes the player guessed.
 * @property {PegColour[]} feedback - Per-position colour for each guessed note.
 */

/**
 * The complete game state: the secret code and all attempts made so far.
 * @typedef {Object} Game
 * @property {Secret}    secret   - The hidden code for this game.
 * @property {Attempt[]} attempts - All guesses made so far, in order.
 */

/**
 * Feedback for a single note in a chord guess.
 * @typedef {"green"|"empty"} ChordFeedback
 */

/**
 * A single chord attempt.
 * @typedef {Object} ChordAttempt
 * @property {Note[]}          guess    - The notes the player guessed.
 * @property {ChordFeedback[]} feedback - Green for each note in the
 *     chord, empty otherwise.
 */

/**
 * Chord game state.
 * @typedef {Object} ChordGame
 * @property {Note[]}          secret   - The chord the player must identify.
 * @property {ChordAttempt[]}  attempts - All guesses made so far, in order.
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** All playable notes, in keyboard order. */
const NOTES = ["C", "D", "E", "F", "G", "A", "B", "C2"];

/** Number of notes in a secret code. */
const CODE_LENGTH = 4;

/** Maximum number of attempts before the game is lost. */
const MAX_ATTEMPTS = 10;

// ── Core logic ───────────────────────────────────────────────────────────────

/**
 * Score a single guess against the secret code.
 *
 * A green peg means the note is correct and in the right position.
 * A red peg means the note appears in the secret but in a different position.
 * Each note in the secret can only account for one peg.
 *
 * Curried - partially apply the secret to get a reusable scorer:
 * `const score = get_feedback(secret); score(guess1); score(guess2);`
 *
 * @function get_feedback
 * @param {Secret} secret - The hidden code chosen by the computer.
 * @param {Guess}  guess  - The player's attempt, same length as secret.
 * @returns {Feedback} Object with `greens` and `reds` counts.
 *
 * @example
 * get_feedback(["C","D","E","F"], ["C","E","D","F"])
 * // => { greens: 2, reds: 2 }
 */
const get_feedback = R.curry(function (secret, guess) {
    const greens = R.length(R.filter(
        function (pair) {
            return pair[0] === pair[1];
        },
        R.zip(secret, guess)
    ));

    // For each unique note the maximum peg contribution is
    // min(occurrences in secret, occurrences in guess).
    // Subtracting greens already counted gives the reds.
    const note_matches = R.reduce(
        function (total, note) {
            return total + R.min(
                R.length(R.filter(R.equals(note), secret)),
                R.length(R.filter(R.equals(note), guess))
            );
        },
        0,
        R.uniq(R.concat(secret, guess))
    );

    return {greens, reds: note_matches - greens};
});

/**
 * Return per-position feedback for a guess - "green", "red", or "empty"
 * for each slot.
 *
 * Unlike {@link get_feedback} which returns counts, this maps each
 * position directly to a colour so the UI can label individual pegs.
 * Green means right note, right position; red means right note, wrong
 * position; empty means that note does not appear in the secret at all.
 * Each note in the secret can only account for one peg - a note cannot
 * score both a green and a red simultaneously.
 *
 * Curried - partially apply the secret:
 * `const score_pos = get_positional_feedback(secret);`
 *
 * @function get_positional_feedback
 * @param {Secret} secret - The hidden code.
 * @param {Guess}  guess  - The player's attempt.
 * @returns {PegColour[]} Array of peg colours, one per position.
 *
 * @example
 * get_positional_feedback(["C","D","E","F"], ["C","F","E","G"])
 * // => ["green", "red", "green", "empty"]
 */
const get_positional_feedback = R.curry(function (secret, guess) {
    const indices = R.range(0, guess.length);

    const initial = {
        colours: R.map(R.always("empty"), guess),
        pool: R.clone(secret)
    };

    // Pass 1 - mark exact matches green; remove them from the pool
    // so they cannot also claim a red peg.
    const mark_green = function (acc, i) {
        return (
            secret[i] !== guess[i]
            ? acc
            : {
                colours: R.update(i, "green", acc.colours),
                pool: R.update(i, null, acc.pool)
            }
        );
    };

    // Pass 2 - for each non-green slot, claim a matching pool note
    // and mark it red.
    const mark_red = function (acc, i) {
        const idx = (
            acc.colours[i] === "green"
            ? -1
            : R.indexOf(guess[i], acc.pool)
        );
        return (
            idx === -1
            ? acc
            : {
                colours: R.update(i, "red", acc.colours),
                pool: R.update(idx, null, acc.pool)
            }
        );
    };

    // R.pipe threads the accumulator through both passes then extracts
    // the colours array.
    return R.pipe(
        function (acc) {
            return R.reduce(mark_green, acc, indices);
        },
        function (acc) {
            return R.reduce(mark_red, acc, indices);
        },
        R.prop("colours")
    )(initial);
});

// ── Predicates ───────────────────────────────────────────────────────────────

/**
 * Return true if the player's last guess matched the secret exactly.
 *
 * @param {Game} game
 * @returns {boolean}
 *
 * @example
 * is_won(make_guess(["C","D","E","F"], create_game(["C","D","E","F"])))
 * // => true
 */
function is_won(game) {
    const last = R.last(game.attempts);
    return last !== undefined && R.all(R.equals("green"), last.feedback);
}

/**
 * Return true if the player has used all attempts without winning.
 *
 * @param {Game} game
 * @returns {boolean}
 *
 * @example
 * // After 10 wrong guesses:
 * is_lost(game) // => true
 */
function is_lost(game) {
    return R.length(game.attempts) >= MAX_ATTEMPTS && !is_won(game);
}

/**
 * Return true if the game has ended - either the player won or all
 * attempts have been used.
 *
 * @function is_over
 * @param {Game} game
 * @returns {boolean}
 *
 * @example
 * is_over(create_game(["C","D","E","F"])) // => false
 * is_over(make_guess(["C","D","E","F"], create_game(["C","D","E","F"])))
 * // => true
 */
const is_over = R.either(is_won, is_lost);

// ── Game factory & updater ───────────────────────────────────────────────────

/**
 * Create a new game with an empty attempt list.
 *
 * @param {Secret} secret - The hidden code for this game.
 * @returns {Game} A fresh game object.
 *
 * @example
 * const game = create_game(["C", "D", "E", "F"]);
 * // => { attempts: [], secret: ["C","D","E","F"] }
 */
function create_game(secret) {
    return {
        attempts: [],
        secret: R.clone(secret)
    };
}

/**
 * Return a new game state with the guess (and its feedback) appended.
 * The original game state is never modified - each call returns a fresh
 * game object with the new attempt added.
 *
 * If the game is already over (won or lost), the state is returned
 * unchanged - extra guesses are silently ignored.
 *
 * Curried - partially apply the guess:
 * `const try_c = make_guess(["C","C","C","C"]);`
 *
 * @function make_guess
 * @param {Guess} guess - The player's new guess.
 * @param {Game}  game  - Current game state.
 * @returns {Game} Updated game state.
 *
 * @example
 * make_guess(["C","A","A","A"], create_game(["C","D","E","F"]))
 * // => game with 1 attempt, feedback ["green","empty","empty","empty"]
 */
const make_guess = R.curry(function (guess, game) {
    const new_attempt = {
        feedback: get_positional_feedback(game.secret, guess),
        guess: R.clone(guess)
    };
    return (
        is_over(game)
        ? game
        : R.over(
            R.lensProp("attempts"),
            R.append(new_attempt),
            game
        )
    );
});

// ── Accessors ────────────────────────────────────────────────────────────────

/**
 * Return the list of all attempts made so far.
 *
 * @function get_attempts
 * @param {Game} game
 * @returns {Attempt[]}
 *
 * @example
 * get_attempts(create_game(["C","D","E","F"])) // => []
 */
const get_attempts = R.pipe(R.prop("attempts"), R.clone);

/**
 * Return the number of attempts made so far.
 *
 * @function get_attempt_count
 * @param {Game} game
 * @returns {number}
 *
 * @example
 * get_attempt_count(create_game(["C","D","E","F"])) // => 0
 */
const get_attempt_count = R.pipe(R.prop("attempts"), R.length);

/**
 * Return the number of attempts still available.
 *
 * @function get_remaining_attempts
 * @param {Game} game
 * @returns {number}
 *
 * @example
 * get_remaining_attempts(create_game(["C","D","E","F"])) // => 10
 */
const get_remaining_attempts = R.pipe(
    R.prop("attempts"),
    R.length,
    R.subtract(MAX_ATTEMPTS)
);

/**
 * Return the secret code for the current game.
 *
 * @function get_secret
 * @param {Game} game
 * @returns {Secret}
 *
 * @example
 * get_secret(create_game(["C","D","E","F"])) // => ["C","D","E","F"]
 */
const get_secret = R.pipe(R.prop("secret"), R.clone);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a random secret of length CODE_LENGTH by sampling from `notes`
 * with replacement (same note may appear more than once).
 *
 * Curried - partially apply the rng:
 * `const make_secret = random_secret(Math.random);`
 *
 * @function random_secret
 * @param {function(): number} rng   - Zero-argument function returning a
 *   number in [0, 1). Pass `Math.random` for normal play.
 * @param {Note[]} notes - Pool of notes to draw from (typically NOTES).
 * @returns {Secret}
 *
 * @example
 * random_secret(Math.random, NOTES) // => e.g. ["C","G","C","D"]
 */
const random_secret = R.curry(function (rng, notes) {
    return R.times(
        function () {
            return R.nth(
                Math.floor(rng() * R.length(notes)),
                notes
            );
        },
        CODE_LENGTH
    );
});

// ── Chord mode ───────────────────────────────────────────────────────────────

/** Maximum guesses allowed in chord mode. */
const CHORD_MAX_ATTEMPTS = 5;

/**
 * Sample `count` unique notes from `pool` without replacement.
 * No note appears twice in the result - each selected note is excluded
 * from the draw for subsequent picks. Each call with a seeded rng
 * produces the same result (pure, deterministic).
 *
 * Curried - partially apply rng + count:
 * `const pick3 = random_chord_secret(Math.random, 3);`
 *
 * @function random_chord_secret
 * @param {function(): number} rng   - Zero-argument function returning a
 *   number in [0, 1). Pass `Math.random` for normal play.
 * @param {number} count - Number of notes to pick.
 * @param {Note[]} pool  - Notes to sample from (no duplicates expected).
 * @returns {Note[]} Array of `count` distinct notes.
 *
 * @example
 * random_chord_secret(Math.random, 3, ["C","D","E","F","G"])
 * // => e.g. ["E","C","G"]
 */
const random_chord_secret = R.curry(function (rng, count, pool) {
    return R.reduce(
        function (acc) {
            const remaining = R.without(acc, pool);
            return R.append(
                R.nth(
                    Math.floor(rng() * R.length(remaining)),
                    remaining
                ),
                acc
            );
        },
        [],
        R.range(0, count)
    );
});

/**
 * Score a chord guess - "green" for each note present in the chord,
 * "empty" for each note absent.
 *
 * Curried - partially apply the secret:
 * `const score = get_chord_feedback(secret); score(guess1); score(guess2);`
 *
 * @function get_chord_feedback
 * @param {Note[]} secret - The chord: notes the player must identify.
 * @param {Note[]} guess  - The player's guessed set of notes.
 * @returns {ChordFeedback[]}
 *
 * @example
 * get_chord_feedback(["C","E","G"], ["C","D","G"])
 * // => ["green","empty","green"]
 */
const get_chord_feedback = R.curry(function (secret, guess) {
    return R.map(
        function (note) {
            return (
                R.includes(note, secret)
                ? "green"
                : "empty"
            );
        },
        guess
    );
});

/**
 * Create a new chord game with an empty attempt list.
 *
 * @param {Note[]} secret - The chord the player must identify.
 * @returns {ChordGame} A fresh chord game.
 *
 * @example
 * create_chord_game(["C","E","G"])
 * // => { attempts: [], secret: ["C","E","G"] }
 */
function create_chord_game(secret) {
    return {
        attempts: [],
        secret: R.clone(secret)
    };
}

/**
 * Return true if the player's last chord guess identified all notes.
 *
 * @param {ChordGame} chord_game
 * @returns {boolean}
 *
 * @example
 * const cg = create_chord_game(["C","E","G"]);
 * chord_is_won(make_chord_guess(["C","E","G"], cg)) // => true
 */
function chord_is_won(chord_game) {
    const last = R.last(chord_game.attempts);
    return last !== undefined && R.all(R.equals("green"), last.feedback);
}

/**
 * Return true if the player has used all chord attempts without winning.
 *
 * @param {ChordGame} chord_game
 * @returns {boolean}
 *
 * @example
 * // After CHORD_MAX_ATTEMPTS wrong guesses:
 * chord_is_lost(chord_game) // => true
 */
function chord_is_lost(chord_game) {
    const exhausted = (
        R.length(chord_game.attempts) >= CHORD_MAX_ATTEMPTS
    );
    return exhausted && !chord_is_won(chord_game);
}

/**
 * Return true if the chord game has ended - either the player won or all
 * attempts have been used.
 *
 * @function chord_is_over
 * @param {ChordGame} chord_game
 * @returns {boolean}
 *
 * @example
 * chord_is_over(create_chord_game(["C","E","G"])) // => false
 */
const chord_is_over = R.either(chord_is_won, chord_is_lost);

/**
 * Return a new chord game state with the guess (and its feedback) appended.
 * The original chord game state is never modified.
 *
 * If the chord game is already over, the state is returned unchanged.
 *
 * Curried - partially apply the guess:
 * `const try_ceg = make_chord_guess(["C","E","G"]);`
 *
 * @function make_chord_guess
 * @param {Note[]}    guess      - The player's guessed set of notes.
 * @param {ChordGame} chord_game - Current chord game state.
 * @returns {ChordGame} Updated chord game state.
 *
 * @example
 * make_chord_guess(["C","D","G"], create_chord_game(["C","E","G"]))
 * // => chord game with 1 attempt, feedback ["green","empty","green"]
 */
const make_chord_guess = R.curry(function (guess, chord_game) {
    const new_attempt = {
        feedback: get_chord_feedback(chord_game.secret, guess),
        guess: R.clone(guess)
    };
    return (
        chord_is_over(chord_game)
        ? chord_game
        : R.over(
            R.lensProp("attempts"),
            R.append(new_attempt),
            chord_game
        )
    );
});

// ── Module export ────────────────────────────────────────────────────────────

export default Object.freeze({
    CHORD_MAX_ATTEMPTS,
    CODE_LENGTH,
    MAX_ATTEMPTS,
    NOTES,
    chord_is_lost,
    chord_is_over,
    chord_is_won,
    create_chord_game,
    create_game,
    get_attempt_count,
    get_attempts,
    get_chord_feedback,
    get_feedback,
    get_positional_feedback,
    get_remaining_attempts,
    get_secret,
    is_lost,
    is_over,
    is_won,
    make_chord_guess,
    make_guess,
    random_chord_secret,
    random_secret
});
