import { Component, type ReactNode } from 'react'

interface EditorErrorBoundaryProps {
  children: ReactNode
  onCrash: (message: string) => void
}

interface EditorErrorBoundaryState {
  hasError: boolean
}

/**
 * Safety net for crashes that happen after a document has already been mounted into
 * the editor. `assertLoadableDocument` (see `validateDocument.ts`) catches the known
 * "schema mismatch" case before the editor ever mounts, but this boundary is the
 * defense-in-depth for every other crash source inside `DocumentWorkspace`/`WordEditor`
 * (e.g. a future pagination/table edge case) — without it, React would unmount the
 * whole tree and leave a blank white screen, exactly the defect
 * `datei-oeffnen-req.md` §2.2 Punkt 2/4 calls out. Catching it here and calling back
 * into `App.tsx` returns the user to the `FormatPicker` with a normal, dismissible
 * error banner instead, exactly like any other failed import.
 */
export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  state: EditorErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): EditorErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    this.props.onCrash(error instanceof Error ? error.message : String(error))
  }

  render() {
    // Render nothing while the crash is being handled — `onCrash` (called from
    // `componentDidCatch`) is expected to swap the parent back to a non-crashed view
    // (e.g. `FormatPicker`) on its next render, which replaces this boundary entirely.
    if (this.state.hasError) return null
    return this.props.children
  }
}
