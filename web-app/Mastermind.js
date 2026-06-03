/*jslint module*/
/**
 * @module Mastermind
 * Pure game-logic module for Piano Mastermind — no DOM, no side-effects.
 */

import R from "./ramda.js";

// ── Type definitions ─────────────────────────────────────────────────────────

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
 * The result of scoring a guess — counts of correct and misplaced notes.
 * @typedef {{ greens: number, reds: number }} Feedback
 */

/**
 * Per-position peg colour: "green" (right note, right place),
 * "red" (right note, wrong place), or "empty" (note absent from secret).
 * @typedef {"green"|"red"|"empty"} PegColour
 */

/**
 * A single recorded attempt, pairing the guess with its feedback.
 * @typedef {{ guess: Guess, feedback: Feedback }} Attempt
 */

/**
 * The complete game state: the secret code and all attempts made so far.
 * @typedef {{ secret: Secret, attempts: Attempt[] }} Game
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
 * @param {Secret} secret - The hidden code chosen by the computer.
 * @param {Guess}  guess  - The player's attempt, same length as secret.
 * @returns {Feedback} Object with `greens` and `reds` counts.
 *
 * @example
 * get_feedback(["C","D","E","F"], ["C","E","D","F"])
 * // => { greens: 2, reds: 2 }
 */
function get_feedback(secret, guess) {
    // Count exact position matches (greens) by zipping the two arrays
    // and filtering for equal pairs.
    const greens = R.filter(
        function (pair) { return pair[0] === pair[1]; },
        R.zip(secret, guess)
    ).length;

    // For each unique note, the maximum peg contribution is
    // min(occurrences in secret, occurrences in guess).
    // Subtracting greens already counted gives the reds.
    const note_matches = R.reduce(
        function (total, note) {
            return total + R.min(
                R.filter(R.equals(note), secret).length,
                R.filter(R.equals(note), guess).length
            );
        },
        0,
        R.uniq(R.concat(secret, guess))
    );

    return { greens, reds: note_matches - greens };
}

/**
 * Return per-position feedback for a guess — "green", "red", or "empty"
 * for each slot.
 *
 * Unlike {@link get_feedback} which returns counts, this maps each
 * position directly to a colour so the UI can label individual pegs.
 * Green means right note, right position; red means right note, wrong
 * position; empty means that note does not appear in the secret at all.
 *
 * @param {Secret} secret - The hidden code.
 * @param {Guess}  guess  - The player's attempt.
 * @returns {PegColour[]} Array of peg colours, one per position.
 *
 * @example
 * get_positional_feedback(["C","D","E","F"], ["C","F","E","G"])
 * // => ["green", "red", "green", "empty"]
 */
function get_positional_feedback(secret, guess) {
    // Pass 1 — mark exact matches green; build pool of unclaimed secret notes.
    const after_greens = R.reduce(
        function (acc, i) {
            return secret[i] !== guess[i]
                ? acc
                : {
                    colours: R.update(i, "green", acc.colours),
                    pool: R.update(i, null, acc.pool)
                };
        },
        { colours: R.map(R.always("empty"), guess), pool: R.clone(secret) },
        R.range(0, guess.length)
    );

    // Pass 2 — for each non-green position, claim a matching note from
    // the remaining pool and mark it red.
    return R.reduce(
        function (acc, i) {
            const idx = acc.colours[i] === "green" ? -1 : R.indexOf(guess[i], acc.pool);
            return idx === -1
                ? acc
                : {
                    colours: R.update(i, "red", acc.colours),
                    pool: R.update(idx, null, acc.pool)
                };
        },
        after_greens,
        R.range(0, guess.length)
    ).colours;
}

// ── Predicates ───────────────────────────────────────────────────────────────

/**
 * Return true if the player's last guess matched the secret exactly.
 *
 * @param {Game} game
 * @returns {boolean}
 *
 * @example
 * is_won(make_guess(create_game(["C","D","E","F"]), ["C","D","E","F"]))
 * // => true
 */
function is_won(game) {
    return !R.isEmpty(game.attempts) &&
        R.last(game.attempts).feedback.greens === game.secret.length;
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
 * Return true if the game has ended (won or lost).
 * Composed from {@link is_won} and {@link is_lost} using R.either.
 *
 * @param {Game} game
 * @returns {boolean}
 *
 * @example
 * is_over(create_game(["C","D","E","F"])) // => false
 * is_over(make_guess(create_game(["C","D","E","F"]), ["C","D","E","F"])) // => true
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
 * // => { secret: ["C","D","E","F"], attempts: [] }
 */
function create_game(secret) {
    return { secret: R.clone(secret), attempts: [] };
}

/**
 * Return a new game state with the guess (and its feedback) appended.
 * Does not mutate the original game object.
 *
 * @param {Game}  game  - Current game state.
 * @param {Guess} guess - The player's new guess.
 * @returns {Game} Updated game state.
 *
 * @example
 * make_guess(create_game(["C","D","E","F"]), ["C","A","A","A"])
 * // => game with 1 attempt, feedback { greens: 1, reds: 0 }
 */
function make_guess(game, guess) {
    return is_over(game)
        ? game
        : {
            secret: game.secret,
            attempts: R.append(
                { guess: R.clone(guess), feedback: get_feedback(game.secret, guess) },
                game.attempts
            )
        };
}

// ── Accessors ────────────────────────────────────────────────────────────────

/**
 * Return the list of all attempts made so far.
 *
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
 * @param {Game} game
 * @returns {number}
 *
 * @example
 * get_remaining_attempts(create_game(["C","D","E","F"])) // => 10
 */
function get_remaining_attempts(game) {
    return R.subtract(MAX_ATTEMPTS, R.length(game.attempts));
}

/**
 * Return the secret code for the current game.
 * Used only when revealing the answer on game-over.
 *
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
 * @param {Note[]} notes - Pool of notes to draw from (typically NOTES).
 * @returns {Secret}
 *
 * @example
 * random_secret(NOTES) // => e.g. ["C","G","C","D"]
 */
function random_secret(notes) {
    return R.times(
        function () {
            return R.nth(Math.floor(Math.random() * notes.length), notes);
        },
        CODE_LENGTH
    );
}

// ── Module export ─────────────────────────────────────────────────────────────

export default Object.freeze({
    NOTES,
    CODE_LENGTH,
    MAX_ATTEMPTS,
    get_feedback,
    get_positional_feedback,
    create_game,
    make_guess,
    is_won,
    is_lost,
    is_over,
    get_attempts,
    get_attempt_count,
    get_remaining_attempts,
    get_secret,
    random_secret
});
