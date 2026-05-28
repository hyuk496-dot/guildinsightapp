'use client';

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderInline(text) {
  // very small inline renderer: **bold** + links [text](/path)
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(
    /\[([^\]]+)\]\((\/[^)]+)\)/g,
    `<a href="$2" data-gi-link="1">$1</a>`
  );
  return html;
}

function Block({ type, children }) {
  if (type === "h1") return <h1 className="h1">{children}</h1>;
  if (type === "h2") return <h2 className="h2">{children}</h2>;
  if (type === "h3") return <h3 className="h3">{children}</h3>;
  if (type === "p") return <p className="p">{children}</p>;
  if (type === "li") return <li className="li">{children}</li>;
  if (type === "hr") return <hr className="hr" />;
  return <div>{children}</div>;
}

export function LegalMarkdown({ markdown }) {
  const lines = String(markdown || "").split(/\r?\n/);

  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list?.length) {
      blocks.push({ type: "ul", items: list });
    }
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }

    if (line.startsWith("---")) {
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    const h1 = line.match(/^#\s+(.+)/);
    if (h1) {
      flushList();
      blocks.push({ type: "h1", text: h1[1] });
      continue;
    }
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      flushList();
      blocks.push({ type: "h2", text: h2[1] });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      flushList();
      blocks.push({ type: "h3", text: h3[1] });
      continue;
    }

    const li = line.match(/^- (.+)/);
    if (li) {
      list = list ?? [];
      list.push(li[1]);
      continue;
    }

    flushList();
    blocks.push({ type: "p", text: line });
  }
  flushList();

  return (
    <div className="wrap">
      {blocks.map((b, i) => {
        if (b.type === "ul") {
          return (
            <ul key={i} className="ul">
              {b.items.map((t, j) => (
                <Block key={j} type="li">
                  <span
                    dangerouslySetInnerHTML={{ __html: renderInline(t) }}
                  />
                </Block>
              ))}
            </ul>
          );
        }

        if (b.type === "hr") return <Block key={i} type="hr" />;

        const html = renderInline(b.text);
        // Use Link for internal links rendered from markdown
        if (html.includes('data-gi-link="1"')) {
          // render as HTML, then post-process via CSS for link styling
          return (
            <Block key={i} type={b.type}>
              <span dangerouslySetInnerHTML={{ __html: html }} />
            </Block>
          );
        }

        return (
          <Block key={i} type={b.type}>
            <span dangerouslySetInnerHTML={{ __html: html }} />
          </Block>
        );
      })}

      {/* Convert anchor tags to Next Link behavior for internal routes */}
      <style jsx>{`
        .wrap {
          width: 100%;
        }
        :global(.h1) {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 700;
          color: #00c8ff;
          letter-spacing: 0.06em;
        }
        :global(.h2) {
          margin: 18px 0 8px;
          font-size: 13px;
          font-weight: 700;
          color: rgba(0, 200, 255, 0.9);
        }
        :global(.h3) {
          margin: 14px 0 6px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(180, 210, 240, 0.9);
        }
        :global(.p) {
          margin: 8px 0;
          font-size: 12px;
          line-height: 1.8;
          color: rgba(180, 210, 240, 0.78);
          white-space: pre-wrap;
        }
        :global(.ul) {
          margin: 8px 0 8px 18px;
          padding: 0;
        }
        :global(.li) {
          margin: 6px 0;
          font-size: 12px;
          line-height: 1.7;
          color: rgba(180, 210, 240, 0.78);
        }
        :global(.hr) {
          border: none;
          border-top: 1px dashed rgba(0, 200, 255, 0.18);
          margin: 16px 0;
        }
        .wrap :global(a[data-gi-link="1"]) {
          color: rgba(0, 200, 255, 0.8);
          text-decoration: underline dotted;
          text-underline-offset: 3px;
        }
        .wrap :global(a[data-gi-link="1"]:hover) {
          color: #00c8ff;
        }
      `}</style>
    </div>
  );
}

