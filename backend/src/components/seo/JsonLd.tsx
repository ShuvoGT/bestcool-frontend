/**
 * Renders one or more JSON-LD structured-data blocks. Server component — outputs
 * a <script type="application/ld+json"> with `<` escaped to avoid breaking out of
 * the script tag.
 */
type Json = Record<string, unknown>;

export function JsonLd({ data }: { data: Json | Json[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
