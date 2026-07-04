import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormatModule, OpenDocument } from '../../formats/types'
import { FormatPicker } from '../FormatPicker'

function makeModule(overrides: Partial<FormatModule<string>> = {}): FormatModule<string> {
  return {
    id: 'test-fmt',
    label: 'Test-Format',
    description: 'Ein Format für Tests.',
    extensions: ['.test'],
    mimeTypes: ['text/plain'],
    importFile: async (file) => file.text(),
    exportFile: async (content) => new Blob([content], { type: 'text/plain' }),
    createNew: () => 'neuer inhalt',
    defaultName: 'unbenannt',
    editor: () => null,
    ...overrides,
  }
}

describe('FormatPicker', () => {
  it('lists available modules and planned formats', () => {
    render(
      <FormatPicker
        modules={[makeModule()]}
        planned={[{ id: 'p', label: 'Geplant', description: 'demnächst', extensions: ['.p'] }]}
        onOpen={() => {}}
      />,
    )
    expect(screen.getByText('Test-Format')).toBeInTheDocument()
    expect(screen.getByText('Geplant')).toBeInTheDocument()
    expect(screen.getByText(/bald verfügbar/i)).toBeInTheDocument()
  })

  it('creates a new document from a module', async () => {
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(<FormatPicker modules={[makeModule()]} planned={[]} onOpen={onOpen} />)

    await user.click(screen.getByRole('button', { name: /neu erstellen/i }))

    expect(onOpen).toHaveBeenCalledWith(
      'test-fmt',
      expect.objectContaining<Partial<OpenDocument>>({
        fileName: 'unbenannt.test',
        content: 'neuer inhalt',
        dirty: false,
      }),
    )
  })

  it('imports an uploaded file through the module', async () => {
    const onOpen = vi.fn()
    render(<FormatPicker modules={[makeModule()]} planned={[]} onOpen={onOpen} />)

    const file = new File(['hallo welt'], 'brief.test', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    expect(onOpen).toHaveBeenCalledWith(
      'test-fmt',
      expect.objectContaining({ fileName: 'brief.test', content: 'hallo welt', dirty: false }),
    )
  })

  it('shows an error message when import fails', async () => {
    const failingModule = makeModule({
      importFile: async () => {
        throw new Error('kaputte datei')
      },
    })
    render(<FormatPicker modules={[failingModule]} planned={[]} onOpen={() => {}} />)

    const file = new File(['x'], 'kaputt.test')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    expect(await screen.findByRole('alert')).toHaveTextContent(/kaputte datei/i)
  })

  it('shows an error message when creating a new document fails', async () => {
    const failingModule = makeModule({
      createNew: () => {
        throw new Error('vorlage kaputt')
      },
    })
    const user = userEvent.setup()
    render(<FormatPicker modules={[failingModule]} planned={[]} onOpen={() => {}} />)

    await user.click(screen.getByRole('button', { name: /neu erstellen/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/vorlage kaputt/i)
  })

  it('clears a previous import error banner when creating a new document', async () => {
    const failingModule = makeModule({
      importFile: async () => {
        throw new Error('kaputte datei')
      },
    })
    const user = userEvent.setup()
    render(<FormatPicker modules={[failingModule]} planned={[]} onOpen={() => {}} />)

    const file = new File(['x'], 'kaputt.test')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /neu erstellen/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rapid double-click on "Neu erstellen" does not throw or call onOpen with inconsistent state', async () => {
    const onOpen = vi.fn()
    render(<FormatPicker modules={[makeModule()]} planned={[]} onOpen={onOpen} />)

    const button = screen.getByRole('button', { name: /neu erstellen/i })
    button.click()
    button.click()

    expect(onOpen).toHaveBeenCalledTimes(2)
    for (const call of onOpen.mock.calls) {
      expect(call[0]).toBe('test-fmt')
      expect(call[1]).toEqual(
        expect.objectContaining({ fileName: 'unbenannt.test', content: 'neuer inhalt', dirty: false }),
      )
    }
  })
})
