/**
 * Unit tests for the Mastermind game module.
 * These tests specify the expected behaviour of the game-logic API.
 *
 * Run with: npm test
 */

import Mastermind from "../Mastermind.js";

const {
    NOTES,
    CODE_LENGTH,
    MAX_ATTEMPTS,
    create_game,
    make_guess,
    get_feedback,
    get_positional_feedback,
    is_won,
    is_over,
    is_lost,
    get_attempts,
    get_attempt_count,
    get_remaining_attempts,
    get_secret,
    random_secret
} = Mastermind;

import assert from "assert";

// ---------------------------------------------------------------------------
// get_feedback
// ---------------------------------------------------------------------------

describe("get_feedback", function () {

    describe("greens — right note, right position", function () {

        it("returns 4 greens when the guess exactly matches the secret", function () {
            const result = get_feedback(["C", "D", "E", "F"], ["C", "D", "E", "F"]);
            assert.strictEqual(result.greens, 4, "a perfect match should score 4 greens");
            assert.strictEqual(result.reds, 0, "a perfect match should score 0 reds");
        });

        it("returns 0 greens when no note is in the right position", function () {
            const result = get_feedback(["C", "D", "E", "F"], ["G", "A", "B", "C2"]);
            assert.strictEqual(result.greens, 0, "no shared notes means 0 greens");
            assert.strictEqual(result.reds, 0, "no shared notes means 0 reds");
        });

        it("returns 1 green when exactly one note is correct and in the right position", function () {
            const result = get_feedback(["C", "D", "E", "F"], ["C", "A", "B", "C2"]);
            assert.strictEqual(result.greens, 1, "only position 0 matches");
        });

        it("returns 2 greens for two exact matches", function () {
            const result = get_feedback(["C", "D", "E", "F"], ["C", "D", "B", "C2"]);
            assert.strictEqual(result.greens, 2, "positions 0 and 1 both match");
        });

    });

    describe("reds — right note, wrong position", function () {

        it("returns 4 reds when all notes are present but all in wrong positions", function () {
            const result = get_feedback(["C", "D", "E", "F"], ["D", "C", "F", "E"]);
            assert.strictEqual(result.greens, 0, "all notes misplaced means 0 greens");
            assert.strictEqual(result.reds, 4, "all 4 notes present but misplaced means 4 reds");
        });

        it("returns 1 red when one note is present but in the wrong position", function () {
            const result = get_feedback(["C", "D", "E", "F"], ["G", "C", "B", "C2"]);
            assert.strictEqual(result.greens, 0, "no note in correct position means 0 greens");
            assert.strictEqual(result.reds, 1, "only C is in the secret at wrong position");
        });

        it("does not count a note as both a green and a red", function () {
            // First C is a green; the second C should not also score a red.
            const result = get_feedback(["C", "D", "E", "F"], ["C", "C", "B", "C2"]);
            assert.strictEqual(result.greens, 1, "position 0 is a green");
            assert.strictEqual(result.reds, 0, "the second C should not score a red since C is already claimed");
        });

    });

    describe("duplicate handling", function () {

        it("a duplicate note in the guess scores only as many pegs as it appears in the secret", function () {
            const result = get_feedback(["C", "D", "E", "F"], ["C", "C", "C", "C"]);
            assert.strictEqual(result.greens, 1, "only one C in secret, so only one green");
            assert.strictEqual(result.reds, 0, "no C left unclaimed after the green");
        });

        it("handles a secret with duplicate notes correctly", function () {
            const result = get_feedback(["C", "C", "D", "E"], ["C", "G", "C", "F"]);
            assert.strictEqual(result.greens, 1, "position 0 matches exactly");
            assert.strictEqual(result.reds, 1, "second C in guess matches remaining C in secret");
        });

        it("two duplicate notes in the guess score 2 reds if both exist in the secret at wrong positions", function () {
            const result = get_feedback(["C", "C", "D", "E"], ["D", "E", "C", "C"]);
            assert.strictEqual(result.greens, 0, "no note in its correct position");
            assert.strictEqual(result.reds, 4, "all 4 notes present but none in correct position");
        });

    });

    describe("edge cases", function () {

        it("returns 0 greens and 0 reds when guess and secret share no notes", function () {
            const result = get_feedback(["C", "D", "E", "F"], ["G", "A", "B", "C2"]);
            assert.strictEqual(result.greens, 0, "no shared notes means 0 greens");
            assert.strictEqual(result.reds, 0, "no shared notes means 0 reds");
        });

        it("works when the secret contains all the same note", function () {
            const result = get_feedback(["C", "C", "C", "C"], ["C", "D", "D", "D"]);
            assert.strictEqual(result.greens, 1, "only one position matches");
            assert.strictEqual(result.reds, 0, "no unclaimed Cs remain after the green");
        });

    });

});

// ---------------------------------------------------------------------------
// get_positional_feedback
// ---------------------------------------------------------------------------

describe("get_positional_feedback", function () {

    it("returns all green when the guess exactly matches the secret", function () {
        const result = get_positional_feedback(["C", "D", "E", "F"], ["C", "D", "E", "F"]);
        assert.deepStrictEqual(result, ["green", "green", "green", "green"], "perfect match should be all green");
    });

    it("returns all empty when no notes are shared", function () {
        const result = get_positional_feedback(["C", "D", "E", "F"], ["G", "A", "B", "C2"]);
        assert.deepStrictEqual(result, ["empty", "empty", "empty", "empty"], "no shared notes means all empty");
    });

    it("marks a note red when it is in the secret but in the wrong position", function () {
        const result = get_positional_feedback(["C", "D", "E", "F"], ["G", "C", "B", "C2"]);
        assert.deepStrictEqual(result, ["empty", "red", "empty", "empty"], "C at position 1 is misplaced");
    });

    it("marks exact matches green and misplaced notes red independently", function () {
        const result = get_positional_feedback(["C", "D", "E", "F"], ["C", "E", "D", "F"]);
        assert.deepStrictEqual(result, ["green", "red", "red", "green"], "positions 0 and 3 match; D and E are swapped");
    });

    it("does not count a green note again as a red", function () {
        // C is green at position 0; the second C in the guess should not be red.
        const result = get_positional_feedback(["C", "D", "E", "F"], ["C", "C", "B", "C2"]);
        assert.deepStrictEqual(result, ["green", "empty", "empty", "empty"], "green at 0 consumes the only C; position 1 must be empty");
    });

    it("does not double-count a duplicate note beyond how many times it appears in the secret", function () {
        // Secret has one C; guess has four Cs — only one peg should be awarded.
        const result = get_positional_feedback(["C", "D", "E", "F"], ["C", "C", "C", "C"]);
        assert.deepStrictEqual(result, ["green", "empty", "empty", "empty"], "only one C in secret; extra Cs in guess get no peg");
    });

    it("handles a secret with duplicate notes correctly", function () {
        const result = get_positional_feedback(["C", "C", "D", "E"], ["D", "E", "C", "C"]);
        assert.deepStrictEqual(result, ["red", "red", "red", "red"], "all 4 notes present but none in correct position");
    });

});

// ---------------------------------------------------------------------------
// create_game
// ---------------------------------------------------------------------------

describe("create_game", function () {

    it("starts with an empty attempts list", function () {
        const state = create_game(["C", "D", "E", "F"]);
        assert.strictEqual(get_attempt_count(state), 0, "a fresh game should have 0 attempts");
    });

    it("stores the secret that was passed in", function () {
        const secret = ["G", "A", "B", "C2"];
        assert.deepStrictEqual(get_secret(create_game(secret)), secret, "the stored secret should equal the one passed in");
    });

    it("two games created with different secrets are independent", function () {
        const a = create_game(["C", "D", "E", "F"]);
        const b = create_game(["G", "A", "B", "C2"]);
        assert.notDeepStrictEqual(get_secret(a), get_secret(b), "different secrets should produce different game states");
    });

});

// ---------------------------------------------------------------------------
// make_guess
// ---------------------------------------------------------------------------

describe("make_guess", function () {

    it("records the guess and its feedback in the attempts list", function () {
        const state = make_guess(create_game(["C", "D", "E", "F"]), ["C", "A", "A", "A"]);
        assert.strictEqual(get_attempt_count(state), 1, "attempt count should be 1 after one guess");
        assert.deepStrictEqual(get_attempts(state)[0].guess, ["C", "A", "A", "A"], "stored guess should match what was played");
        assert.strictEqual(get_attempts(state)[0].feedback.greens, 1, "only C matches at position 0");
    });

    it("each successive guess is recorded independently", function () {
        let state = create_game(["C", "D", "E", "F"]);
        state = make_guess(state, ["G", "A", "B", "C2"]);
        state = make_guess(state, ["C", "D", "B", "C2"]);
        assert.strictEqual(get_attempt_count(state), 2, "two guesses should produce two attempts");
        assert.strictEqual(get_attempts(state)[1].feedback.greens, 2, "second guess matches C and D at positions 0 and 1");
    });

    it("does nothing if the game is already won", function () {
        let state = create_game(["C", "D", "E", "F"]);
        state = make_guess(state, ["C", "D", "E", "F"]);
        const count = get_attempt_count(state);
        state = make_guess(state, ["G", "A", "B", "C2"]);
        assert.strictEqual(get_attempt_count(state), count, "attempt count must not change after the game is won");
    });

    it("does nothing if the game is already lost", function () {
        let state = create_game(["C", "D", "E", "F"]);
        for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
            state = make_guess(state, ["G", "A", "B", "C2"]);
        }
        const count = get_attempt_count(state);
        state = make_guess(state, ["G", "A", "B", "C2"]);
        assert.strictEqual(get_attempt_count(state), count, "attempt count must not change after the game is lost");
    });

    it("decrements remaining attempts with each guess", function () {
        let state = create_game(["C", "D", "E", "F"]);
        assert.strictEqual(get_remaining_attempts(state), MAX_ATTEMPTS, "fresh game should have MAX_ATTEMPTS remaining");
        state = make_guess(state, ["G", "A", "B", "C2"]);
        assert.strictEqual(get_remaining_attempts(state), MAX_ATTEMPTS - 1, "one guess should reduce remaining attempts by 1");
    });

});

// ---------------------------------------------------------------------------
// is_won
// ---------------------------------------------------------------------------

describe("is_won", function () {

    it("is false on a new game", function () {
        assert.strictEqual(is_won(create_game(["C", "D", "E", "F"])), false, "no guesses means the game cannot be won yet");
    });

    it("is true immediately after a correct guess", function () {
        const secret = ["C", "D", "E", "F"];
        assert.strictEqual(is_won(make_guess(create_game(secret), secret)), true, "guessing the exact secret should win the game");
    });

    it("is false after an incorrect guess", function () {
        const state = make_guess(create_game(["C", "D", "E", "F"]), ["G", "A", "B", "C2"]);
        assert.strictEqual(is_won(state), false, "a wrong guess should not win the game");
    });

});

// ---------------------------------------------------------------------------
// is_lost
// ---------------------------------------------------------------------------

describe("is_lost", function () {

    it("is false when attempts remain", function () {
        const state = make_guess(create_game(["C", "D", "E", "F"]), ["G", "A", "B", "C2"]);
        assert.strictEqual(is_lost(state), false, "one wrong guess with 9 remaining should not be a loss");
    });

    it("is true after MAX_ATTEMPTS wrong guesses", function () {
        let state = create_game(["C", "D", "E", "F"]);
        for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
            state = make_guess(state, ["G", "A", "B", "C2"]);
        }
        assert.strictEqual(is_lost(state), true, "exhausting all attempts without winning should be a loss");
    });

    it("is false even after MAX_ATTEMPTS if the final guess is correct", function () {
        let state = create_game(["C", "D", "E", "F"]);
        for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
            state = make_guess(state, ["G", "A", "B", "C2"]);
        }
        state = make_guess(state, ["C", "D", "E", "F"]);
        assert.strictEqual(is_lost(state), false, "a correct final guess should not count as a loss");
        assert.strictEqual(is_won(state), true, "a correct final guess should still register as a win");
    });

});

// ---------------------------------------------------------------------------
// is_over
// ---------------------------------------------------------------------------

describe("is_over", function () {

    it("is false on a fresh game", function () {
        assert.strictEqual(is_over(create_game(["C", "D", "E", "F"])), false, "a new game with no guesses should not be over");
    });

    it("is true when the game is won", function () {
        const secret = ["C", "D", "E", "F"];
        assert.strictEqual(is_over(make_guess(create_game(secret), secret)), true, "a won game should be over");
    });

    it("is true when all attempts are exhausted", function () {
        let state = create_game(["C", "D", "E", "F"]);
        for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
            state = make_guess(state, ["G", "A", "B", "C2"]);
        }
        assert.strictEqual(is_over(state), true, "a lost game should be over");
    });

});

// ---------------------------------------------------------------------------
// get_attempts
// ---------------------------------------------------------------------------

describe("get_attempts", function () {

    it("returns an empty array before any guesses", function () {
        assert.deepStrictEqual(get_attempts(create_game(["C", "D", "E", "F"])), [], "no guesses means empty attempts list");
    });

    it("returns one attempt after one guess", function () {
        const state = make_guess(create_game(["C", "D", "E", "F"]), ["G", "A", "B", "C2"]);
        assert.strictEqual(get_attempts(state).length, 1, "one guess should produce exactly one attempt");
    });

    it("each attempt contains the guess and its feedback", function () {
        const guess = ["C", "D", "G", "A"];
        const state = make_guess(create_game(["C", "D", "E", "F"]), guess);
        const attempt = get_attempts(state)[0];
        assert.deepStrictEqual(attempt.guess, guess, "stored guess should match what was submitted");
        assert.strictEqual(attempt.feedback.greens, 2, "C and D match at positions 0 and 1");
    });

});

// ---------------------------------------------------------------------------
// get_attempt_count
// ---------------------------------------------------------------------------

describe("get_attempt_count", function () {

    it("is 0 on a new game", function () {
        assert.strictEqual(get_attempt_count(create_game(["C", "D", "E", "F"])), 0, "fresh game has no attempts");
    });

    it("increments by 1 with each guess", function () {
        let state = create_game(["C", "D", "E", "F"]);
        for (let i = 1; i <= 5; i += 1) {
            state = make_guess(state, ["G", "A", "B", "C2"]);
            assert.strictEqual(get_attempt_count(state), i, `after ${i} guesses count should be ${i}`);
        }
    });

    it("does not exceed MAX_ATTEMPTS even when extra guesses are attempted", function () {
        let state = create_game(["C", "D", "E", "F"]);
        for (let i = 0; i < MAX_ATTEMPTS + 3; i += 1) {
            state = make_guess(state, ["G", "A", "B", "C2"]);
        }
        assert.strictEqual(get_attempt_count(state), MAX_ATTEMPTS, "attempt count is capped at MAX_ATTEMPTS");
    });

});

// ---------------------------------------------------------------------------
// get_remaining_attempts
// ---------------------------------------------------------------------------

describe("get_remaining_attempts", function () {

    it("equals MAX_ATTEMPTS on a new game", function () {
        assert.strictEqual(get_remaining_attempts(create_game(["C", "D", "E", "F"])), MAX_ATTEMPTS, "all attempts should remain at the start");
    });

    it("decrements by 1 with each wrong guess", function () {
        let state = create_game(["C", "D", "E", "F"]);
        for (let i = 0; i < 4; i += 1) {
            state = make_guess(state, ["G", "A", "B", "C2"]);
        }
        assert.strictEqual(get_remaining_attempts(state), MAX_ATTEMPTS - 4, "4 guesses should leave MAX_ATTEMPTS - 4 remaining");
    });

    it("reaches 0 when all attempts are used", function () {
        let state = create_game(["C", "D", "E", "F"]);
        for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
            state = make_guess(state, ["G", "A", "B", "C2"]);
        }
        assert.strictEqual(get_remaining_attempts(state), 0, "exhausting all attempts should leave 0 remaining");
    });

});

// ---------------------------------------------------------------------------
// get_secret
// ---------------------------------------------------------------------------

describe("get_secret", function () {

    it("returns the secret code used to create the game", function () {
        const secret = ["C", "D", "E", "F"];
        assert.deepStrictEqual(get_secret(create_game(secret)), secret, "get_secret should return the original secret unchanged");
    });

});

// ---------------------------------------------------------------------------
// random_secret
// ---------------------------------------------------------------------------

describe("random_secret", function () {

    it("returns an array of CODE_LENGTH notes", function () {
        assert.strictEqual(random_secret(NOTES).length, CODE_LENGTH, "secret must have exactly CODE_LENGTH notes");
    });

    it("every note in the secret is drawn from the supplied pool", function () {
        random_secret(NOTES).forEach(function (note) {
            assert.ok(NOTES.includes(note), `${note} is not in NOTES`);
        });
    });

    it("respects a restricted note pool", function () {
        const pool = ["C", "D"];
        random_secret(pool).forEach(function (note) {
            assert.ok(pool.includes(note), `${note} should be drawn only from the restricted pool`);
        });
    });

    it("produces varied results across calls", function () {
        const secrets = Array.from({ length: 10 }, () => random_secret(NOTES).join(","));
        assert.ok(new Set(secrets).size > 1, "random_secret appears to always return the same value");
    });

});
