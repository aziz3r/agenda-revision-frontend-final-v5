export type StrapiItem<T> = { id:number; attributes?: T } | (T & { id:number })

export function fromStrapi<T>(node: StrapiItem<T>): T & { id:number } {
  if (!node) throw new Error('Empty node')
  // @ts-ignore
  if (node.attributes) return { id: (node as any).id, ...(node as any).attributes }
  return node as any
}

export function listFromStrapi<T>(arr: StrapiItem<T>[]): (T & { id:number })[] {
  return (arr || []).map(fromStrapi<T>)
}

// Convert from <input type="datetime-local"> "YYYY-MM-DDTHH:mm" to ISO zulu
export const localToISO = (local: string | null | undefined) => {
  if (!local) return null
  const d = new Date(local)
  return isNaN(d.getTime()) ? null : d.toISOString()
}
