// audit.mjs — axe-core accessibility audit across all app states
import { chromium } from "playwright";
import { default as AxeBuilder } from "@axe-core/playwright";

const BASE = "http://localhost:8787/web-app/index.html";

async function run_axe(page, label) {
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .analyze();

    console.log(`\n${"=".repeat(60)}`);
    console.log(`STATE: ${label}`);
    console.log(`  violations: ${results.violations.length}`);
    console.log(`  incomplete: ${results.incomplete.length}`);

    for (const v of results.violations) {
        const nodes = v.nodes.map((n) => {
            const el = n.html.slice(0, 120);
            const target = n.target.join(", ");
            const detail = (n.any[0] || n.all[0] || n.none[0]);
            const msg = detail ? detail.message : "";
            return `      target: ${target}\n      html:   ${el}\n      msg:    ${msg}`;
        }).join("\n      ---\n");
        console.log(`\n  [VIOLATION] ${v.id} (${v.impact})`);
        console.log(`  rule: ${v.help}`);
        console.log(`  url:  ${v.helpUrl}`);
        console.log(`  nodes:\n${nodes}`);
    }

    for (const i of results.incomplete) {
        const nodes = i.nodes.map((n) => {
            const el = n.html.slice(0, 120);
            const target = n.target.join(", ");
            return `      target: ${target}\n      html:   ${el}`;
        }).join("\n      ---\n");
        console.log(`\n  [INCOMPLETE] ${i.id} (${i.impact || "unknown"})`);
        console.log(`  rule: ${i.help}`);
        console.log(`  nodes:\n${nodes}`);
    }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
    viewport: { width: 1512, height: 982 }
});
const page = await ctx.newPage();

// Suppress audio errors
page.on("pageerror", () => {});
page.on("console", () => {});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// ── State 1: Landing page (random mode) ────────────────────────────
await run_axe(page, "Landing page — random mode");

// ── State 2: How-to modal open ──────────────────────────────────────
await page.click("#btn-how-to-play");
await page.waitForTimeout(300);
await run_axe(page, "How-to-play modal open");

// Close modal
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

// ── State 3: Game-over overlay (win) — force by making 4 correct guesses
//    We can't easily win without knowing the secret, so we'll trigger the
//    game-over by playing MAX_ATTEMPTS wrong guesses instead (loss state).
//    To do that we use keyboard notes: asdg = C D E G (wrong secret)
//    The game auto-submits once CODE_LENGTH notes are picked.
//    Play 10 sets of 4 wrong notes to exhaust attempts.

// First reload to ensure clean state
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Focus page to ensure keyboard works
await page.click("body");

// Play 10 sets of 4 keyboard notes (a=C, s=D, d=E, g=G)
// This will exhaust all 10 attempts with note sequences C D E G
for (let i = 0; i < 10; i++) {
    await page.keyboard.press("a");
    await page.waitForTimeout(100);
    await page.keyboard.press("s");
    await page.waitForTimeout(100);
    await page.keyboard.press("d");
    await page.waitForTimeout(100);
    await page.keyboard.press("g");
    await page.waitForTimeout(300);
}

await page.waitForTimeout(600);

// ── State 4: Game-over overlay open ────────────────────────────────
const gameover_visible = await page.isVisible("#overlay-gameover");
if (gameover_visible) {
    await run_axe(page, "Game-over overlay (loss state)");
} else {
    console.log("\nSTATE: Game-over overlay — COULD NOT TRIGGER (secret matched guesses)");
}

// Close and play again
await page.click("#btn-play-again").catch(() => {});
await page.waitForTimeout(300);

// ── State 5: Chord mode ─────────────────────────────────────────────
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Cycle mode button to reach chord mode: random → melody → perfect pitch → chord
await page.click("#btn-mode");
await page.waitForTimeout(300);
await page.click("#btn-mode");
await page.waitForTimeout(300);
await page.click("#btn-mode");
await page.waitForTimeout(300);
await page.click("#btn-mode");
await page.waitForTimeout(500);

const mode_text = await page.$eval("#btn-mode", (el) => el.textContent.trim());
console.log(`\nCurrent mode after 4 clicks: "${mode_text}"`);
await run_axe(page, `Chord mode (mode: "${mode_text}")`);

// ── State 6: Listen overlay (perfect pitch mode) ────────────────────
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Cycle to perfect pitch: random → melody → perfect pitch
await page.click("#btn-mode");
await page.waitForTimeout(300);
await page.click("#btn-mode");
await page.waitForTimeout(300);
await page.click("#btn-mode");
await page.waitForTimeout(1500); // wait for listen overlay to appear

const listen_visible = await page.isVisible("#overlay-listen");
if (listen_visible) {
    await run_axe(page, "Listen overlay (perfect pitch mode)");
} else {
    console.log("\nSTATE: Listen overlay — not visible after 3 mode clicks");
    const current_mode = await page.$eval("#btn-mode", (el) => el.textContent.trim());
    console.log(`Current mode: "${current_mode}"`);
}

// ── State 7: Free play mode ─────────────────────────────────────────
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Cycle to free play (5th mode): random → melody → perfect pitch → chord → free play
for (let i = 0; i < 5; i++) {
    await page.click("#btn-mode");
    await page.waitForTimeout(300);
}
const free_text = await page.$eval("#btn-mode", (el) => el.textContent.trim());
console.log(`\nMode after 5 clicks: "${free_text}"`);
await run_axe(page, `Free play mode (mode: "${free_text}")`);

await browser.close();
// Kill the server
process.exit(0);
