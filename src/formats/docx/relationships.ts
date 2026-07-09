import { escapeXml } from './xmlUtil'

export interface Relationship {
  id: string
  type: string
  target: string
  /** OPC TargetMode. External targets (hyperlink URLs) MUST carry
   * TargetMode="External" — without it Word treats the Target as an internal package
   * path and reports the file as corrupt (hyperlink-einfuegen-req.md §0.7). Internal
   * part references omit the attribute (the OPC default). */
  targetMode?: 'External'
}

/** Allocates sequential rIds and serializes a `_rels/*.rels` part. */
export class RelationshipRegistry {
  private relationships: Relationship[] = []
  private counter = 0

  add(type: string, target: string, targetMode?: 'External'): string {
    this.counter += 1
    const id = `rId${this.counter}`
    this.relationships.push({ id, type, target, targetMode })
    return id
  }

  all(): Relationship[] {
    return this.relationships
  }

  serialize(): string {
    const entries = this.relationships
      .map(
        (rel) =>
          // Target is attacker-/user-controlled for external URLs (querystrings with
          // `&`, quotes) — unescaped it produced an unparseable .rels part
          // (hyperlink-einfuegen-req.md §0.7, latent even for image file names).
          `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${escapeXml(rel.target)}"${
            rel.targetMode ? ` TargetMode="${rel.targetMode}"` : ''
          }/>`,
      )
      .join('')
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries}</Relationships>`
    )
  }
}

export const RELATIONSHIP_TYPES = {
  officeDocument: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
  styles: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles',
  numbering: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering',
  header: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header',
  footer: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer',
  image: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
  hyperlink: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
  coreProperties: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties',
} as const
