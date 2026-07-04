export interface Relationship {
  id: string
  type: string
  target: string
}

/** Allocates sequential rIds and serializes a `_rels/*.rels` part. */
export class RelationshipRegistry {
  private relationships: Relationship[] = []
  private counter = 0

  add(type: string, target: string): string {
    this.counter += 1
    const id = `rId${this.counter}`
    this.relationships.push({ id, type, target })
    return id
  }

  all(): Relationship[] {
    return this.relationships
  }

  serialize(): string {
    const entries = this.relationships
      .map((rel) => `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${rel.target}"/>`)
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
  coreProperties: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties',
} as const
