/*global describe, it*/
/**
 * Unit tests for the Mastermind game module.
 * These tests specify the expected behaviour of the game-logic API.
 *
 * Run with: npm test
 */

import Mastermind from "../Mastermind.js";

const {
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
} = Mastermind;

import assert from "assert";

// ── get_feedback ─────────────────────────────────────────────────────────────

describe("get_feedback", function () {

    describe("greens — right note, right position", function () {

        it(
            "returns 4 greens when the guess exactly matches the secret",
            function () {
                const result = get_feedback(
                    ["C", "D", "E", "F"],
                    ["C", "D", "E", "F"]
                );
                assert.strictEqual(
                    result.greens,
                    4,
                    "a perfect match should score 4 greens"
                );
                assert.strictEqual(
                    result.reds,
                    0,
                    "a perfect match should score 0 reds"
                );
            }
        );

        it(
            "returns 0 greens and 0 reds for a completely wrong guess",
            function () {
                const result = get_feedback(
                    ["C", "D", "E", "F"],
                    ["G", "A", "B", "C2"]
                );
                assert.strictEqual(
                    result.greens,
                    0,
                    "no position matches should give 0 greens"
                );
                assert.strictEqual(
                    result.reds,
                    0,
                    "no note overlap should give 0 reds"
                );
            }
        );

        it(
            "scores one green per note in the correct position",
            function () {
                const result = get_feedback(
                    ["C", "D", "E", "F"],
                    ["C", "G", "A", "B"]
                );
                assert.strictEqual(
                    result.greens,
                    1,
                    "only C matches position 0"
                );
            }
        );

    });

    describe("reds — right note, wrong position", function () {

        it(
            "scores one red for each note present but misplaced",
            function () {
                const result = get_feedback(
                    ["C", "D", "E", "F"],
                    ["D", "C", "F", "E"]
                );
                assert.strictEqual(
                    result.greens,
                    0,
                    "no note is in its correct position"
                );
                assert.strictEqual(
                    result.reds,
                    4,
                    "all four notes are present but misplaced"
                );
            }
        );

        it(
            "does not double-count a note that appears twice in the guess",
            function () {
                const result = get_feedback(
                    ["C", "D", "E", "F"],
                    ["C", "C", "C", "C"]
                );
                assert.strictEqual(
                    result.greens,
                    1,
                    "one C is in the right position"
                );
                assert.strictEqual(
                    result.reds,
                    0,
                    "extra Cs beyond the secret count should not score reds"
                );
            }
        );

        it(
            "mixes greens and reds correctly for a partial match",
            function () {
                const result = get_feedback(
                    ["C", "D", "E", "F"],
                    ["C", "D", "G", "A"]
                );
                assert.strictEqual(
                    result.greens,
                    2,
                    "C at 0 and D at 1 are green"
                );
                assert.strictEqual(
                    result.reds,
                    0,
                    "G and A do not appear in the secret at all"
                );
            }
        );

    });

    describe("edge cases", function () {

        it(
            "handles a single-note secret and guess",
            function () {
                const hit = get_feedback(["C"], ["C"]);
                assert.strictEqual(hit.greens, 1, "one note, exact match");
                assert.strictEqual(hit.reds, 0, "no misplaced notes");
                const miss = get_feedback(["C"], ["D"]);
                assert.strictEqual(miss.greens, 0, "wrong note, no greens");
                assert.strictEqual(miss.reds, 0, "note not in secret, no reds");
            }
        );

        it(
            "works with sharps and two-octave notes",
            function () {
                const result = get_feedback(
                    ["C#", "D#", "C2", "D2"],
                    ["C#", "D#", "C2", "D2"]
                );
                assert.strictEqual(
                    result.greens,
                    4,
                    "sharps and octave-2 notes should match positionally"
                );
            }
        );

    });

});

// ── get_positional_feedback ──────────────────────────────────────────────────

describe("get_positional_feedback", function () {

    it(
        "returns array of green/red/empty strings for each position",
        function () {
            const fb = get_positional_feedback(
                ["C", "D", "E", "F"],
                ["C", "D", "G", "A"]
            );
            assert.deepStrictEqual(
                fb,
                ["green", "green", "empty", "empty"],
                "C and D match; G and A are not in the secret"
            );
        }
    );

    it(
        "returns all green for a perfect match",
        function () {
            const fb = get_positional_feedback(
                ["C", "D", "E", "F"],
                ["C", "D", "E", "F"]
            );
            assert.deepStrictEqual(
                fb,
                ["green", "green", "green", "green"],
                "exact match should produce all greens"
            );
        }
    );

    it(
        "returns a red for a note present but in the wrong position",
        function () {
            const fb = get_positional_feedback(
                ["C", "D", "E", "F"],
                ["D", "G", "G", "G"]
            );
            assert.strictEqual(
                fb[0],
                "red",
                "D is in the secret but not at position 0"
            );
        }
    );

    it(
        "returns all empty for a completely wrong guess",
        function () {
            const fb = get_positional_feedback(
                ["C", "D", "E", "F"],
                ["G", "A", "B", "C2"]
            );
            assert.deepStrictEqual(
                fb,
                ["empty", "empty", "empty", "empty"],
                "no overlap at all means all empty"
            );
        }
    );

    it(
        "has length equal to the guess array length",
        function () {
            const fb = get_positional_feedback(
                ["C", "D", "E", "F"],
                ["C", "D", "E", "F"]
            );
            assert.strictEqual(
                fb.length,
                4,
                "feedback length must match guess length"
            );
        }
    );

});

// ── make_guess ───────────────────────────────────────────────────────────────

describe("make_guess", function () {

    it(
        "records the guess and its positional feedback",
        function () {
            const state = make_guess(
                ["C", "D", "G", "A"],
                create_game(["C", "D", "E", "F"])
            );
            const attempt = get_attempts(state)[0];
            assert.deepStrictEqual(
                attempt.guess,
                ["C", "D", "G", "A"],
                "stored guess must match what was submitted"
            );
            assert.deepStrictEqual(
                attempt.feedback,
                ["green", "green", "empty", "empty"],
                "C and D match positions 0 and 1"
            );
        }
    );

    it(
        "does nothing if the game is already won",
        function () {
            const state = make_guess(
                ["C", "D", "E", "F"],
                create_game(["C", "D", "E", "F"])
            );
            const count = get_attempt_count(state);
            const after = make_guess(["G", "A", "B", "C2"], state);
            assert.strictEqual(
                get_attempt_count(after),
                count,
                "attempt count must not change after the game is won"
            );
        }
    );

    it(
        "does nothing if the game is already lost",
        function () {
            const state = Array.from(
                new Array(MAX_ATTEMPTS).keys()
            ).reduce(
                function (s) {
                    return make_guess(["G", "A", "B", "C2"], s);
                },
                create_game(["C", "D", "E", "F"])
            );
            const count = get_attempt_count(state);
            const after = make_guess(["G", "A", "B", "C2"], state);
            assert.strictEqual(
                get_attempt_count(after),
                count,
                "attempt count must not change after the game is lost"
            );
        }
    );

    it(
        "decrements remaining attempts with each guess",
        function () {
            let state = create_game(["C", "D", "E", "F"]);
            assert.strictEqual(
                get_remaining_attempts(state),
                MAX_ATTEMPTS,
                "fresh game should have MAX_ATTEMPTS remaining"
            );
            state = make_guess(["G", "A", "B", "C2"], state);
            assert.strictEqual(
                get_remaining_attempts(state),
                MAX_ATTEMPTS - 1,
                "one guess should reduce remaining attempts by 1"
            );
        }
    );

    it(
        "does not mutate the input game state",
        function () {
            const original = create_game(["C", "D", "E", "F"]);
            const count_before = get_attempt_count(original);
            make_guess(["G", "A", "B", "C2"], original);
            assert.strictEqual(
                get_attempt_count(original),
                count_before,
                "make_guess must not alter its input — " +
                "the original game state must be unchanged"
            );
        }
    );

});

// ── is_won ───────────────────────────────────────────────────────────────────

describe("is_won", function () {

    it("is false on a new game", function () {
        assert.strictEqual(
            is_won(create_game(["C", "D", "E", "F"])),
            false,
            "no guesses means the game cannot be won yet"
        );
    });

    it(
        "is true immediately after a correct guess",
        function () {
            const secret = ["C", "D", "E", "F"];
            assert.strictEqual(
                is_won(make_guess(secret, create_game(secret))),
                true,
                "guessing the exact secret should win the game"
            );
        }
    );

    it("is false after an incorrect guess", function () {
        const state = make_guess(
            ["G", "A", "B", "C2"],
            create_game(["C", "D", "E", "F"])
        );
        assert.strictEqual(
            is_won(state),
            false,
            "a wrong guess should not win the game"
        );
    });

    it(
        "works correctly with a 6-note perfect-pitch secret",
        function () {
            const secret = ["C", "C", "G", "G", "A", "A"];
            assert.strictEqual(
                is_won(make_guess(secret, create_game(secret))),
                true,
                "a 6-note perfect match should win"
            );
            const wrong = ["C", "C", "G", "G", "A", "B"];
            assert.strictEqual(
                is_won(make_guess(wrong, create_game(secret))),
                false,
                "a 6-note near-miss should not win"
            );
        }
    );

});

// ── is_lost ──────────────────────────────────────────────────────────────────

describe("is_lost", function () {

    it("is false when attempts remain", function () {
        const state = make_guess(
            ["G", "A", "B", "C2"],
            create_game(["C", "D", "E", "F"])
        );
        assert.strictEqual(
            is_lost(state),
            false,
            "one wrong guess with 9 remaining should not be a loss"
        );
    });

    it(
        "is true after MAX_ATTEMPTS wrong guesses",
        function () {
            const state = Array.from(
                new Array(MAX_ATTEMPTS).keys()
            ).reduce(
                function (s) {
                    return make_guess(["G", "A", "B", "C2"], s);
                },
                create_game(["C", "D", "E", "F"])
            );
            assert.strictEqual(
                is_lost(state),
                true,
                "exhausting all attempts without winning should be a loss"
            );
        }
    );

    it(
        "is false even after MAX_ATTEMPTS if the final guess is correct",
        function () {
            const penultimate = Array.from(
                new Array(MAX_ATTEMPTS - 1).keys()
            ).reduce(
                function (s) {
                    return make_guess(["G", "A", "B", "C2"], s);
                },
                create_game(["C", "D", "E", "F"])
            );
            const state = make_guess(
                ["C", "D", "E", "F"],
                penultimate
            );
            assert.strictEqual(
                is_lost(state),
                false,
                "a correct final guess should not count as a loss"
            );
            assert.strictEqual(
                is_won(state),
                true,
                "a correct final guess should still register as a win"
            );
        }
    );

});

// ── is_over ──────────────────────────────────────────────────────────────────

describe("is_over", function () {

    it("is false on a fresh game", function () {
        assert.strictEqual(
            is_over(create_game(["C", "D", "E", "F"])),
            false,
            "a new game with no guesses should not be over"
        );
    });

    it("is true when the game is won", function () {
        const secret = ["C", "D", "E", "F"];
        assert.strictEqual(
            is_over(make_guess(secret, create_game(secret))),
            true,
            "a won game should be over"
        );
    });

    it(
        "is true when all attempts are exhausted",
        function () {
            const state = Array.from(
                new Array(MAX_ATTEMPTS).keys()
            ).reduce(
                function (s) {
                    return make_guess(["G", "A", "B", "C2"], s);
                },
                create_game(["C", "D", "E", "F"])
            );
            assert.strictEqual(
                is_over(state),
                true,
                "a lost game should be over"
            );
        }
    );

});

// ── get_attempts ─────────────────────────────────────────────────────────────

describe("get_attempts", function () {

    it(
        "returns an empty array before any guesses",
        function () {
            assert.deepStrictEqual(
                get_attempts(create_game(["C", "D", "E", "F"])),
                [],
                "no guesses means empty attempts list"
            );
        }
    );

    it("returns one attempt after one guess", function () {
        const state = make_guess(
            ["G", "A", "B", "C2"],
            create_game(["C", "D", "E", "F"])
        );
        assert.strictEqual(
            get_attempts(state).length,
            1,
            "one guess should produce exactly one attempt"
        );
    });

    it(
        "each attempt contains the guess and its feedback",
        function () {
            const guess = ["C", "D", "G", "A"];
            const state = make_guess(
                guess,
                create_game(["C", "D", "E", "F"])
            );
            const attempt = get_attempts(state)[0];
            assert.deepStrictEqual(
                attempt.guess,
                guess,
                "stored guess should match what was submitted"
            );
            assert.deepStrictEqual(
                attempt.feedback,
                ["green", "green", "empty", "empty"],
                "C and D match at positions 0 and 1"
            );
        }
    );

    it(
        "returns a copy — mutating the result does not affect the game",
        function () {
            const state = make_guess(
                ["G", "A", "B", "C2"],
                create_game(["C", "D", "E", "F"])
            );
            const returned = get_attempts(state);
            returned.push({feedback: [], guess: ["X"]});
            assert.strictEqual(
                get_attempts(state).length,
                1,
                "get_attempts must return a clone — " +
                "push must not alter stored attempts"
            );
        }
    );

});

// ── get_attempt_count ────────────────────────────────────────────────────────

describe("get_attempt_count", function () {

    it("is 0 on a new game", function () {
        assert.strictEqual(
            get_attempt_count(create_game(["C", "D", "E", "F"])),
            0,
            "fresh game has no attempts"
        );
    });

    it("increments by 1 with each guess", function () {
        Array.from(new Array(5).keys()).reduce(
            function (s, n) {
                const next = make_guess(["G", "A", "B", "C2"], s);
                const i = n + 1;
                assert.strictEqual(
                    get_attempt_count(next),
                    i,
                    "after " + i + " guesses count should be " + i
                );
                return next;
            },
            create_game(["C", "D", "E", "F"])
        );
    });

    it(
        "does not exceed MAX_ATTEMPTS even when extra guesses are attempted",
        function () {
            const state = Array.from(
                new Array(MAX_ATTEMPTS + 3).keys()
            ).reduce(
                function (s) {
                    return make_guess(["G", "A", "B", "C2"], s);
                },
                create_game(["C", "D", "E", "F"])
            );
            assert.strictEqual(
                get_attempt_count(state),
                MAX_ATTEMPTS,
                "attempt count is capped at MAX_ATTEMPTS"
            );
        }
    );

});

// ── get_remaining_attempts ───────────────────────────────────────────────────

describe("get_remaining_attempts", function () {

    it("equals MAX_ATTEMPTS on a new game", function () {
        assert.strictEqual(
            get_remaining_attempts(create_game(["C", "D", "E", "F"])),
            MAX_ATTEMPTS,
            "all attempts should remain at the start"
        );
    });

    it("decrements by 1 with each wrong guess", function () {
        const state = Array.from(new Array(4).keys()).reduce(
            function (s) {
                return make_guess(["G", "A", "B", "C2"], s);
            },
            create_game(["C", "D", "E", "F"])
        );
        assert.strictEqual(
            get_remaining_attempts(state),
            MAX_ATTEMPTS - 4,
            "4 guesses should leave MAX_ATTEMPTS - 4 remaining"
        );
    });

    it("reaches 0 when all attempts are used", function () {
        const state = Array.from(
            new Array(MAX_ATTEMPTS).keys()
        ).reduce(
            function (s) {
                return make_guess(["G", "A", "B", "C2"], s);
            },
            create_game(["C", "D", "E", "F"])
        );
        assert.strictEqual(
            get_remaining_attempts(state),
            0,
            "exhausting all attempts should leave 0 remaining"
        );
    });

});

// ── get_secret ───────────────────────────────────────────────────────────────

describe("get_secret", function () {

    it(
        "returns the secret code used to create the game",
        function () {
            const secret = ["C", "D", "E", "F"];
            assert.deepStrictEqual(
                get_secret(create_game(secret)),
                secret,
                "get_secret should return the original secret unchanged"
            );
        }
    );

    it(
        "returns a copy — mutating the result does not affect the game",
        function () {
            const game = create_game(["C", "D", "E", "F"]);
            const returned = get_secret(game);
            returned[0] = "G";
            assert.strictEqual(
                get_secret(game)[0],
                "C",
                "get_secret must return a clone — " +
                "external mutation must not alter stored state"
            );
        }
    );

});

// ── random_secret ────────────────────────────────────────────────────────────

describe("random_secret", function () {

    it("returns an array of CODE_LENGTH notes", function () {
        assert.strictEqual(
            random_secret(Math.random, NOTES).length,
            CODE_LENGTH,
            "secret must have exactly CODE_LENGTH notes"
        );
    });

    it(
        "every note in the secret is drawn from the supplied pool",
        function () {
            random_secret(Math.random, NOTES).forEach(function (note) {
                assert.ok(
                    NOTES.includes(note),
                    note + " is not in NOTES"
                );
            });
        }
    );

    it("respects a restricted note pool", function () {
        const pool = ["C", "D"];
        random_secret(Math.random, pool).forEach(function (note) {
            assert.ok(
                pool.includes(note),
                note + " should be drawn only from the restricted pool"
            );
        });
    });

    it("produces varied results across calls", function () {
        const results = Array.from(new Array(10).keys()).map(
            function () {
                return random_secret(Math.random, NOTES).join(",");
            }
        );
        assert.ok(
            new Set(results).size > 1,
            "random_secret appears to always return the same value"
        );
    });

    it(
        "uses the supplied rng to select notes deterministically",
        function () {
            const always_zero = function () {
                return 0;
            };
            assert.deepStrictEqual(
                random_secret(always_zero, NOTES),
                ["C", "C", "C", "C"],
                "rng returning 0 always picks the first note in the pool"
            );
        }
    );

});

// ── create_chord_game ────────────────────────────────────────────────────────

describe("create_chord_game", function () {

    it("starts with an empty attempts list", function () {
        const game = create_chord_game(["C", "E", "G"]);
        assert.deepStrictEqual(
            game.attempts,
            [],
            "a fresh chord game should have no attempts"
        );
    });

    it("stores the chord passed in", function () {
        const secret = ["C", "E", "G"];
        assert.deepStrictEqual(
            create_chord_game(secret).secret,
            secret,
            "the stored chord should equal the one passed in"
        );
    });

    it(
        "mutating the original array after creation does not affect the game",
        function () {
            const secret = ["C", "E", "G"];
            const game = create_chord_game(secret);
            secret[0] = "D";
            assert.strictEqual(
                game.secret[0],
                "C",
                "create_chord_game must clone the secret"
            );
        }
    );

    it(
        "two games created with different chords are independent",
        function () {
            const a = create_chord_game(["C", "E", "G"]);
            const b = create_chord_game(["D", "F", "A"]);
            assert.notDeepStrictEqual(
                a.secret,
                b.secret,
                "different chords should produce different game states"
            );
        }
    );

});

// ── get_chord_feedback ───────────────────────────────────────────────────────

describe("get_chord_feedback", function () {

    it(
        "marks every note green when the guess equals the chord",
        function () {
            const result = get_chord_feedback(
                ["C", "E", "G"],
                ["C", "E", "G"]
            );
            assert.deepStrictEqual(
                result,
                ["green", "green", "green"],
                "all notes in chord means all green"
            );
        }
    );

    it(
        "marks every note empty when no note is in the chord",
        function () {
            const result = get_chord_feedback(
                ["C", "E", "G"],
                ["D", "F", "A"]
            );
            assert.deepStrictEqual(
                result,
                ["empty", "empty", "empty"],
                "no notes in chord means all empty"
            );
        }
    );

    it(
        "marks notes correctly in a mixed guess",
        function () {
            const result = get_chord_feedback(
                ["C", "E", "G"],
                ["C", "D", "G"]
            );
            assert.deepStrictEqual(
                result,
                ["green", "empty", "green"],
                "C and G are in chord, D is not"
            );
        }
    );

    it("works with a 5-note chord", function () {
        const result = get_chord_feedback(
            ["C", "D", "E", "G", "A"],
            ["C", "F", "E", "G", "A"]
        );
        assert.deepStrictEqual(
            result,
            ["green", "empty", "green", "green", "green"],
            "F is not in the chord, all others are"
        );
    });

    it(
        "a duplicate note in the guess that is in the chord" +
        " scores green for each occurrence",
        function () {
            const result = get_chord_feedback(
                ["C", "E", "G"],
                ["C", "C", "G"]
            );
            assert.deepStrictEqual(
                result,
                ["green", "green", "green"],
                "C appears in chord so both guessed Cs score green"
            );
        }
    );

});

// ── chord_is_won ─────────────────────────────────────────────────────────────

describe("chord_is_won", function () {

    it("is false on a new chord game", function () {
        assert.strictEqual(
            chord_is_won(create_chord_game(["C", "E", "G"])),
            false,
            "no guesses means not won"
        );
    });

    it("is true when all feedback is green", function () {
        const game = make_chord_guess(
            ["C", "E", "G"],
            create_chord_game(["C", "E", "G"])
        );
        assert.strictEqual(
            chord_is_won(game),
            true,
            "a perfect chord guess should win"
        );
    });

    it("is false when feedback is not all green", function () {
        const game = make_chord_guess(
            ["C", "D", "G"],
            create_chord_game(["C", "E", "G"])
        );
        assert.strictEqual(
            chord_is_won(game),
            false,
            "a partial match should not win"
        );
    });

});

// ── chord_is_lost ────────────────────────────────────────────────────────────

describe("chord_is_lost", function () {

    it("is false on a new chord game", function () {
        assert.strictEqual(
            chord_is_lost(create_chord_game(["C", "E", "G"])),
            false,
            "no guesses means not lost"
        );
    });

    it(
        "is true after CHORD_MAX_ATTEMPTS wrong guesses",
        function () {
            const game = Array.from(
                new Array(CHORD_MAX_ATTEMPTS).keys()
            ).reduce(
                function (g) {
                    return make_chord_guess(["D", "F", "A"], g);
                },
                create_chord_game(["C", "E", "G"])
            );
            assert.strictEqual(
                chord_is_lost(game),
                true,
                "exhausting all chord attempts should be a loss"
            );
        }
    );

    it(
        "is false after CHORD_MAX_ATTEMPTS if the final guess is correct",
        function () {
            const penultimate = Array.from(
                new Array(CHORD_MAX_ATTEMPTS - 1).keys()
            ).reduce(
                function (g) {
                    return make_chord_guess(["D", "F", "A"], g);
                },
                create_chord_game(["C", "E", "G"])
            );
            const game = make_chord_guess(["C", "E", "G"], penultimate);
            assert.strictEqual(
                chord_is_lost(game),
                false,
                "a correct final guess is a win not a loss"
            );
            assert.strictEqual(
                chord_is_won(game),
                true,
                "a correct final guess should register as won"
            );
        }
    );

});

// ── chord_is_over ────────────────────────────────────────────────────────────

describe("chord_is_over", function () {

    it("is false on a fresh chord game", function () {
        assert.strictEqual(
            chord_is_over(create_chord_game(["C", "E", "G"])),
            false,
            "a new game is not over"
        );
    });

    it("is true when won", function () {
        const game = make_chord_guess(
            ["C", "E", "G"],
            create_chord_game(["C", "E", "G"])
        );
        assert.strictEqual(
            chord_is_over(game),
            true,
            "a won game is over"
        );
    });

    it(
        "is true when all attempts are exhausted",
        function () {
            const game = Array.from(
                new Array(CHORD_MAX_ATTEMPTS).keys()
            ).reduce(
                function (g) {
                    return make_chord_guess(["D", "F", "A"], g);
                },
                create_chord_game(["C", "E", "G"])
            );
            assert.strictEqual(
                chord_is_over(game),
                true,
                "a lost game is over"
            );
        }
    );

});

// ── make_chord_guess ─────────────────────────────────────────────────────────

describe("make_chord_guess", function () {

    it("records the guess and its feedback", function () {
        const game = make_chord_guess(
            ["C", "D", "G"],
            create_chord_game(["C", "E", "G"])
        );
        assert.deepStrictEqual(
            game.attempts[0].guess,
            ["C", "D", "G"],
            "stored guess must match what was submitted"
        );
        assert.deepStrictEqual(
            game.attempts[0].feedback,
            ["green", "empty", "green"],
            "feedback must reflect chord membership"
        );
    });

    it("does not mutate the input state", function () {
        const original = create_chord_game(["C", "E", "G"]);
        const count_before = original.attempts.length;
        make_chord_guess(["C", "D", "G"], original);
        assert.strictEqual(
            original.attempts.length,
            count_before,
            "make_chord_guess must not alter its input"
        );
    });

    it("does nothing once the game is won", function () {
        let game = make_chord_guess(
            ["C", "E", "G"],
            create_chord_game(["C", "E", "G"])
        );
        const count = game.attempts.length;
        game = make_chord_guess(["D", "F", "A"], game);
        assert.strictEqual(
            game.attempts.length,
            count,
            "no new attempt should be added after the game is won"
        );
    });

    it("does nothing once the game is lost", function () {
        const lost = Array.from(
            new Array(CHORD_MAX_ATTEMPTS).keys()
        ).reduce(
            function (g) {
                return make_chord_guess(["D", "F", "A"], g);
            },
            create_chord_game(["C", "E", "G"])
        );
        const count = lost.attempts.length;
        const after = make_chord_guess(["C", "E", "G"], lost);
        assert.strictEqual(
            after.attempts.length,
            count,
            "no new attempt should be added after the game is lost"
        );
    });

});

// ── random_chord_secret ──────────────────────────────────────────────────────

describe("random_chord_secret", function () {

    it("returns an array of exactly the requested count", function () {
        assert.strictEqual(
            random_chord_secret(Math.random, 3, NOTES).length,
            3,
            "should return exactly 3 notes when count is 3"
        );
    });

    it("returns 5 notes when count is 5", function () {
        assert.strictEqual(
            random_chord_secret(Math.random, 5, NOTES).length,
            5,
            "should return exactly 5 notes when count is 5"
        );
    });

    it(
        "every note is drawn from the supplied pool",
        function () {
            const pool = ["C", "E", "G", "B", "D"];
            random_chord_secret(Math.random, 3, pool).forEach(
                function (note) {
                    assert.ok(
                        pool.includes(note),
                        note + " is not in the pool"
                    );
                }
            );
        }
    );

    it(
        "all returned notes are unique (no duplicates)",
        function () {
            const result = random_chord_secret(Math.random, 5, NOTES);
            const unique = new Set(result);
            assert.strictEqual(
                unique.size,
                result.length,
                "random_chord_secret must not repeat notes"
            );
        }
    );

    it(
        "uses the rng deterministically — same rng produces same result",
        function () {
            let call_count = 0;
            const seq = [0.1, 0.5, 0.9];
            const seeded_rng = function () {
                const val = seq[call_count % seq.length];
                call_count += 1;
                return val;
            };
            const pool = ["C", "D", "E", "F", "G"];
            const first = random_chord_secret(seeded_rng, 3, pool);
            call_count = 0;
            const second = random_chord_secret(seeded_rng, 3, pool);
            assert.deepStrictEqual(
                first,
                second,
                "same rng sequence must yield the same chord secret"
            );
        }
    );

});
