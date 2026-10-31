import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const dir = mkdtempSync(join(tmpdir(), 'trickart-'));

/** Synthesises a short moving-test-pattern clip with the system ffmpeg. */
function makeClip(name: string, codecArgs: string[]): string {
  const out = join(dir, name);
  execFileSync(
    'ffmpeg',
    ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x568:rate=12:duration=2', ...codecArgs, out],
    { stdio: 'inherit' },
  );
  return out;
}

/** Fails the test on any off-origin request, CSP violation or uncaught page error. */
function guard(page: Page) {
  const problems: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', ''].includes(u.hostname) && u.protocol.startsWith('http')) problems.push(`off-origin request: ${r.url()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (/content security policy|refused to/i.test(m.text())) problems.push(`CSP: ${m.text()}`);
  });
  return problems;
}

async function generate(page: Page, clip: string) {
  await page.goto('./');
  await page.locator('input[type=file]').first().setInputFiles(clip);
  await expect(page.getByText('VIDEO READY')).toBeVisible();
  const gen = page.getByRole('button', { name: 'GENERATE ART' }).first();
  await expect(gen).toBeEnabled();
  await gen.click();
  await expect(page.getByText(/DONE|ERROR/).first()).toBeVisible({ timeout: 150_000 });
}

test('loads with no off-origin requests or CSP violations', async ({ page }) => {
  const problems = guard(page);
  await page.goto('./');
  await expect(page.getByText('Drop your clip')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
  const fonts = await page.evaluate(() => document.fonts.check("700 16px 'Unbounded'"));
  expect(fonts).toBe(true);
});

test('webm clip → art → PNG download (MediaPipe served from our origin)', async ({ page }) => {
  const problems = guard(page);
  const vendored = new Map<string, number>();
  page.on('response', (r) => {
    if (r.url().includes('/vendor/mediapipe-pose/')) vendored.set(r.url().split('/').pop()!, r.status());
  });
  await generate(page, makeClip('clip.webm', ['-c:v', 'libvpx', '-b:v', '1M']));
  await expect(page.getByText('DONE')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /PNG/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^trick-art-\d+\.png$/);
  // If these 404 the app silently falls back to pixel-diff, so assert the model really loaded.
  expect(vendored.get('pose.js')).toBe(200);
  expect(vendored.get('pose_landmark_full.tflite')).toBe(200);
  expect(problems).toEqual([]);
});

test('undecodable clip is transcoded with self-hosted FFmpeg.wasm', async ({ page }) => {
  const problems = guard(page);
  // MPEG-4 part 2 in AVI: Chromium can't decode it, so this exercises the FFmpeg.wasm path.
  await generate(page, makeClip('clip.avi', ['-c:v', 'mpeg4']));
  await expect(page.getByText('DONE')).toBeVisible();
  expect(problems).toEqual([]);
});

test('body-part picker: choose parts, re-render from the cached analysis, and disable without pose', async ({ page }) => {
  const problems = guard(page);
  await generate(page, makeClip('parts.webm', ['-c:v', 'libvpx', '-b:v', '1M']));

  // The sheet closes while generating on mobile; reopen it.
  await page.getByText('STYLE & GENERATE').click();
  const whole = page.getByRole('button', { name: 'Whole body' });
  const leftFoot = page.getByRole('button', { name: 'L Foot' });
  const rightArm = page.getByRole('button', { name: 'R Arm' });

  await expect(whole).toHaveAttribute('aria-pressed', 'true');
  await leftFoot.click();
  await expect(leftFoot).toHaveAttribute('aria-pressed', 'true');
  await expect(whole).toHaveAttribute('aria-pressed', 'false');
  await rightArm.click();
  await expect(rightArm).toHaveAttribute('aria-pressed', 'true');
  await rightArm.click();
  await leftFoot.click(); // the last selected part can't be switched off
  await expect(leftFoot).toHaveAttribute('aria-pressed', 'true');

  // Re-rendering reuses the pose analysis, so this lands well inside the default 5s timeout.
  // The test clip has nobody in it, so the app must say it fell back to the whole body.
  await page.getByRole('button', { name: 'GENERATE ART' }).first().click();
  await expect(page.getByText(/NO BODY FOUND/)).toBeVisible();

  await page.getByText('STYLE & GENERATE').click();
  await page.getByRole('switch', { name: 'Pose Tracking' }).click();
  await expect(leftFoot).toBeDisabled();
  expect(problems).toEqual([]);
});
