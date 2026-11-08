function formatInline(text) {
  return text
    .split(/(\*\*[^*]+\*\*|__[^_]+__)/g)
    .map((part, index) => (index % 2 ? <strong key={index}>{part.slice(2, -2)}</strong> : part));
}

export default function CookingAnswer({ text }) {
  const blocks = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const item = /^(\d+\.|[*+-])\s+(.+)$/.exec(trimmed);
    if (item) {
      const type = item[1].endsWith('.') ? 'ol' : 'ul';
      const previous = blocks.at(-1);
      if (previous?.type === type) {
        previous.items.push(item[2]);
      } else {
        blocks.push({
          type,
          items: [item[2]],
          start: type === 'ol' ? Number.parseInt(item[1], 10) : undefined,
        });
      }
      continue;
    }

    const heading = /^#{1,6}\s+(.+)$/.exec(trimmed);
    blocks.push({ type: 'p', content: heading?.[1] ?? trimmed, heading: Boolean(heading) });
  }

  return blocks.map(({ type: Tag, content, items, start, heading }, index) => (
    <Tag key={index} start={start}>
      {items ? (
        items.map((item, itemIndex) => <li key={itemIndex}>{formatInline(item)}</li>)
      ) : heading ? (
        <strong>{formatInline(content)}</strong>
      ) : (
        formatInline(content)
      )}
    </Tag>
  ));
}
