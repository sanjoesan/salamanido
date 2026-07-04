import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

// These fixtures are *deliberately* broken/encrypted test files from the ODF Toolkit
// corpus (used there to test its own error handling) — a thrown error is the correct,
// expected outcome, not a bug in our reader.
const KNOWN_INVALID = new Set(['invalid.odt', 'PasswordProtected.odt', 'testInvalidPkg2.odt', 'testInvalidPkg3.odt'])

// brokenList.odt (2.4 MB, ~20k automatic styles) takes 90s+ to import under Vitest's
// jsdom environment — jsdom's DOM implementation is dramatically slower than a real
// browser engine at this element count. Confirmed via a dedicated Playwright/Chromium
// run that the actual app imports this file in ~575ms, so this is a jsdom-only test
// artifact, not a product bug. Covered instead by tests/e2e/large-document-import.spec.ts.
const SKIP_SLOW_UNDER_JSDOM = new Set(['brokenList.odt'])

function loadFixtures(): Array<{ name: string; buffer: Buffer }> {
  return readdirSync(FIXTURES_DIR).map((name) => ({ name, buffer: readFileSync(join(FIXTURES_DIR, name)) }))
}

describe('ODT reader vs. real-world fixtures (apache/tdf test corpora)', () => {
  const fixtures = loadFixtures()

  it('found the expected number of fixture files', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(50)
  })

  const results: Array<{ name: string; ok: boolean; error?: string; paragraphCount?: number }> = []

  for (const { name, buffer } of fixtures) {
    if (SKIP_SLOW_UNDER_JSDOM.has(name)) continue

    if (KNOWN_INVALID.has(name)) {
      it(`rejects deliberately invalid "${name}" with an error, not a crash/hang`, async () => {
        const blob = new Blob([new Uint8Array(buffer)])
        await expect(readOdt(blob)).rejects.toBeTruthy()
      })
      continue
    }

    it(`imports "${name}" without crashing`, async () => {
      try {
        const blob = new Blob([new Uint8Array(buffer)])
        const doc = await readOdt(blob)
        const paragraphCount = (doc.body as { content?: unknown[] }).content?.length ?? 0
        results.push({ name, ok: true, paragraphCount })
        expect(doc.body).toBeTruthy()
      } catch (err) {
        results.push({ name, ok: false, error: err instanceof Error ? err.message : String(err) })
        throw err
      }
    }, 10_000)
  }

  afterAll(() => {
    const failed = results.filter((r) => !r.ok)
    const succeeded = results.filter((r) => r.ok)
    // eslint-disable-next-line no-console
    console.log(
      `\nODT fixture import summary: ${succeeded.length}/${results.length} succeeded, ${failed.length} failed.`,
    )
    if (failed.length) {
      // eslint-disable-next-line no-console
      console.log(failed.map((f) => `  - ${f.name}: ${f.error}`).join('\n'))
    }
  })
})
