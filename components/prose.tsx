export function Prose({ html }: { html: string }) {
  return (
    <div
      className="prose prose-stone max-w-none prose-headings:font-semibold prose-headings:tracking-tight"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
