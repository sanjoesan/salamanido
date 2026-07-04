import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormatModule, PlannedFormat } from '../../formats/types'

// App.tsx imports its format modules from '../formats/registry' — mock that registry
// with a module whose editor component throws on mount, so we can drive a real crash
// through the real EditorErrorBoundary without needing an actually-malformed document
// (see EditorErrorBoundary.tsx, datei-oeffnen-code.md §1).
const crashingModule: FormatModule<string> = {
  id: 'crash-fmt',
  label: 'Absturz-Format',
  description: 'Testformat, dessen Editor beim Mounten wirft.',
  extensions: ['.crash'],
  mimeTypes: ['text/plain'],
  importFile: async () => 'irrelevant',
  exportFile: async () => new Blob(['irrelevant']),
  createNew: () => 'irrelevant',
  defaultName: 'unbenannt',
  editor: () => {
    throw new Error('Editor-Absturz beim Mounten')
  },
}

vi.mock('../../formats/registry', () => ({
  formatModules: [crashingModule],
  plannedFormats: [] as PlannedFormat[],
  findModuleById: (id: string) => (id === 'crash-fmt' ? crashingModule : undefined),
  findModuleByExtension: () => crashingModule,
}))

describe('App: EditorErrorBoundary crash recovery (U-7)', () => {
  it('returns to the FormatPicker with a visible error banner instead of a blank white screen when the editor crashes on mount', async () => {
    const { default: App } = await import('../../App')
    const user = userEvent.setup()
    // Suppress React's expected error-boundary console.error noise for this test.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await user.click(screen.getByRole('button', { name: /verstanden/i }))

    // Trigger the crash by "creating" a new document of the crashing format.
    await user.click(screen.getByRole('button', { name: 'Neu erstellen' }))

    // render() itself must not have thrown (no uncaught exception escaped, no blank page).
    expect(await screen.findByRole('alert')).toHaveTextContent(/konnte nicht angezeigt werden/i)
    // Back at the FormatPicker — its heading is visible again, not a white screen.
    expect(screen.getByRole('heading', { name: /salamanido/i })).toBeInTheDocument()
    // The crashed editor is gone.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})
