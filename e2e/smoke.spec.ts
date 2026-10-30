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
