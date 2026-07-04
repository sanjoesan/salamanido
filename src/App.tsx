import { useState } from 'react'
import { PrivacyBanner } from './app/PrivacyBanner'
import { PrivacyModal } from './app/PrivacyModal'
import { FormatPicker } from './app/FormatPicker'
import { DocumentWorkspace } from './app/DocumentWorkspace'
import { EditorErrorBoundary } from './app/EditorErrorBoundary'
import { formatModules, plannedFormats, findModuleById } from './formats/registry'
import type { OpenDocument } from './formats/types'
import { useBeforeUnloadWarning } from './lib/useBeforeUnloadWarning'

interface ActiveDocument {
  moduleId: string
  document: OpenDocument
}

function App() {
  const [active, setActive] = useState<ActiveDocument | null>(null)
  const [crashError, setCrashError] = useState<string | null>(null)

  useBeforeUnloadWarning(active?.document.dirty ?? false)

  const activeModule = active ? findModuleById(active.moduleId) : undefined

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-neutral-950">
      <PrivacyModal />
      <PrivacyBanner />
      <main className="flex-1 min-h-0 flex flex-col">
        {active && activeModule ? (
          <EditorErrorBoundary
            onCrash={(message) => {
              setCrashError(`„${active.document.fileName}" konnte nicht angezeigt werden: ${message}`)
              setActive(null)
            }}
          >
            <DocumentWorkspace
              module={activeModule}
              document={active.document}
              onChange={(document) => setActive({ moduleId: active.moduleId, document })}
              onClose={() => setActive(null)}
            />
          </EditorErrorBoundary>
        ) : (
          <FormatPicker
            modules={formatModules}
            planned={plannedFormats}
            onOpen={(moduleId, document) => {
              setCrashError(null)
              setActive({ moduleId, document })
            }}
            initialError={crashError}
          />
        )}
      </main>
    </div>
  )
}

export default App
