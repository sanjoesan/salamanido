import { useEffect, useRef, useState } from 'react'
import { normalizeLinkHref } from './commands'

/**
 * URL-Dialog für „Link einfügen/bearbeiten" (specs/hyperlink-einfuegen-req.md §1 #3–#5,
 * §3.2–§3.4). Gleiche Zugänglichkeits-Mechanik wie TableSizeDialog: Fokus-Trap,
 * Erstfeld-Fokus, Enter=Übernehmen, Escape/Backdrop/„Abbrechen"=schließen ohne Änderung.
 *
 * - Bearbeiten-Fall: `initialHref` befüllt das URL-Feld vor (#4); zusätzlich erscheint
 *   „Link entfernen" (#5) — der Entfernen-Weg lebt bewusst HIER statt als weiterer
 *   Toolbar-Button (der Link-Button ist der eine Einstieg für alle drei Aktionen).
 * - Leerer Cursor außerhalb eines Links: zusätzliches Pflichtfeld „Anzeigetext" — der
 *   bestätigte Text wird bereits verlinkt eingefügt (§3.2b, Word-/Docs-Verhalten).
 * - Ungültige Eingaben (leer, javascript:/data:-Schema) erzeugen eine SICHTBARE
 *   Fehlermeldung statt eines stillen No-Ops (§3.3, Grenzfall 4.9).
 */
export function LinkDialog({
  initialHref,
  needsText,
  onApply,
  onRemove,
  onClose,
}: {
  initialHref: string | null
  needsText: boolean
  onApply: (href: string, text?: string) => void
  onRemove: (() => void) | null
  onClose: () => void
}) {
  const [href, setHref] = useState(initialHref ?? '')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const hrefFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    hrefFieldRef.current?.focus()
    hrefFieldRef.current?.select()
  }, [])

  const commit = () => {
    const normalized = normalizeLinkHref(href)
    if (normalized === null) {
      setError(
        href.trim()
          ? 'Diese Adresse wird aus Sicherheitsgründen nicht übernommen (z. B. javascript:/data:). Bitte eine http(s)-, mailto:- oder tel:-Adresse angeben.'
          : 'Bitte eine Ziel-Adresse angeben — oder mit „Abbrechen" schließen.',
      )
      return
    }
    if (needsText && !text.trim()) {
      setError('Bitte einen Anzeigetext für den Link angeben.')
      return
    }
    onApply(normalized, needsText ? text.trim() : undefined)
  }

  const onCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const focusables = Array.from(cardRef.current?.querySelectorAll<HTMLElement>('input, button') ?? [])
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = cardRef.current?.ownerDocument.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const fieldClass =
    'w-full min-h-10 px-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100'
  const enterCommit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={initialHref ? 'Link bearbeiten' : 'Link einfügen'}
        onKeyDown={onCardKeyDown}
        className="w-full max-w-sm rounded-lg bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-4"
      >
        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          {initialHref ? 'Link bearbeiten' : 'Link einfügen'}
        </h2>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Ziel-Adresse (URL)
          <input
            ref={hrefFieldRef}
            type="text"
            inputMode="url"
            aria-label="Ziel-Adresse"
            placeholder="https://beispiel.de"
            className={fieldClass}
            value={href}
            onChange={(e) => {
              setError(null)
              setHref(e.target.value)
            }}
            onKeyDown={enterCommit}
          />
        </label>

        {needsText && (
          <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            Anzeigetext
            <input
              type="text"
              aria-label="Anzeigetext"
              className={fieldClass}
              value={text}
              onChange={(e) => {
                setError(null)
                setText(e.target.value)
              }}
              onKeyDown={enterCommit}
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="min-h-10 px-3 mr-auto rounded border border-red-300 dark:border-red-800 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Link entfernen
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-3 rounded border border-neutral-300 dark:border-neutral-600 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={commit}
            className="min-h-10 px-3 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}
