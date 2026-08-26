import { useEffect, useRef } from "react";

/* Obsidian-style "live preview" editor.
 *
 * The trick: rendered markdown keeps its syntax characters in the DOM as
 * .mdm marker spans (e.g. "**" around bold text). Markers are invisible
 * except inside the block the caret is in, so text reads like a rendered
 * page but stays editable as raw markdown. The DOM is the source of truth
 * while typing: on every input we extract the source, re-render, and put
 * the caret back where it was by plain-text offset. */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
const mk = (s) => `<span class="mdm">${esc(s)}</span>`;

function inline(text) {
  const re =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(~~[^~]+~~)|(\[[^\]]+\]\([^)\s]*\))/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    const t = m[0];
    if (m[1]) {
      out += `<code>${mk("`")}${esc(t.slice(1, -1))}${mk("`")}</code>`;
    } else if (m[2] || m[3]) {
      const d = t.slice(0, 2) === "**" ? "**" : "__";
      out += `<strong>${mk(d)}${esc(t.slice(d.length, -d.length))}${mk(d)}</strong>`;
    } else if (m[4]) {
      out += `<em>${mk("*")}${esc(t.slice(1, -1))}${mk("*")}</em>`;
    } else if (m[5]) {
      out += `<del>${mk("~~")}${esc(t.slice(2, -2))}${mk("~~")}</del>`;
    } else {
      const link = t.match(/^\[([^\]]*)\]\(([^)\s]*)\)$/);
      if (link) {
        out +=
          `<a href="${esc(link[2])}" target="_blank" rel="noreferrer">` +
          `${mk("[")}${esc(link[1])}${mk(`](${link[2]})`)}</a>`;
      } else {
        out += esc(t);
      }
    }
    last = m.index + t.length;
  }
  return out + esc(text.slice(last));
}

function render(src) {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let para = [];
  const flush = () => {
    if (para.length) {
      html.push(`<p data-blk>${para.map(inline).join("<br>")}</p>`);
      para = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      flush();
      const fence = line.trim();
      const body = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (/^```/.test(lines[i].trim())) {
          closed = true;
          break;
        }
        body.push(lines[i]);
        i++;
      }
      html.push(
        `<pre data-blk><div class="cl"><span class="mdm">${esc(fence)}</span></div>` +
          body.map((l) => `<div class="cl">${inline(l)}</div>`).join("") +
          (closed
            ? `<div class="cl"><span class="mdm">${esc(fence)}</span></div>`
            : "") +
          `</pre>`
      );
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      const tag = `h${h[1].length}`;
      html.push(`<${tag} data-blk>${mk(h[1] + " ")}${inline(h[2])}</${tag}>`);
      continue;
    }

    if (/^ {0,3}(-{3,}|\*{3,})\s*$/.test(line)) {
      flush();
      html.push(`<p class="md-hr" data-blk data-hr="1">${mk(line.trim())}</p>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flush();
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      i--;
      html.push(
        `<blockquote data-blk>${mk("> ")}${quote
          .map(inline)
          .join("<br>")}</blockquote>`
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const raw = lines[i];
        const mark = raw.match(/^\s*[-*+]\s+/)[0];
        items.push(
          `<li>${mk(mark)}${inline(raw.slice(mark.length))}</li>`
        );
        i++;
      }
      i--;
      html.push(`<ul data-blk>${items.join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const raw = lines[i];
        const mark = raw.match(/^\s*\d+[.)]\s+/)[0];
        items.push(
          `<li>${mk(mark)}${inline(raw.slice(mark.length))}</li>`
        );
        i++;
      }
      i--;
      html.push(`<ol data-blk>${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") flush();
    else para.push(line);
  }
  flush();
  return html.join("");
}

const HARD_BLOCKS = new Set(["P", "H1", "H2", "H3", "BLOCKQUOTE", "PRE"]);

// DOM -> markdown source. Deterministic because we generated the markup.
function extract(node) {
  let out = "";
  for (const ch of node.childNodes) {
    if (ch.nodeType === Node.TEXT_NODE) {
      out += ch.data;
      continue;
    }
    if (ch.nodeType !== Node.ELEMENT_NODE) continue;
    const tag = ch.tagName;
    if (tag === "BR") {
      out += "\n";
      continue;
    }
    out += extract(ch);
    if (tag === "LI" || (tag === "DIV" && ch.classList.contains("cl"))) {
      out += "\n";
    } else if (HARD_BLOCKS.has(tag) || tag === "UL" || tag === "OL" || tag === "DIV") {
      out += "\n";
      if (HARD_BLOCKS.has(tag) || tag === "DIV") out += "\n";
    }
  }
  return out;
}

function calcOffset(root, target, targetOffset) {
  let acc = 0;
  function countAll(n) {
    if (n.nodeType === Node.TEXT_NODE) {
      acc += n.data.length;
      return;
    }
    for (const c of n.childNodes) countAll(c);
  }
  function walk(n) {
    if (n === target) {
      if (n.nodeType === Node.TEXT_NODE) acc += targetOffset;
      else {
        let k = 0;
        for (const c of n.childNodes) {
          if (k >= targetOffset) break;
          countAll(c);
          k++;
        }
      }
      return true;
    }
    if (n.nodeType === Node.TEXT_NODE) {
      acc += n.data.length;
      return false;
    }
    for (const c of n.childNodes) if (walk(c)) return true;
    return false;
  }
  walk(root);
  return acc;
}

function setCaret(root, offset, endOffset) {
  const sel = window.getSelection();
  const range = document.createRange();
  function locate(want) {
    let left = want;
    let lastNode = null;
    function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === Node.TEXT_NODE) {
          if (left <= c.data.length) return c;
          left -= c.data.length;
          lastNode = c;
        } else {
          const found = walk(c);
          if (found) return found;
        }
      }
      return null;
    }
    const node = walk(root) || lastNode || root;
    const inside = node.nodeType === Node.TEXT_NODE;
    return [node, inside ? Math.min(left, node.data.length) : node.childNodes.length];
  }
  const [sn, so] = locate(offset);
  const [en, eo] = endOffset == null ? [sn, so] : locate(endOffset);
  try {
    range.setStart(sn, so);
    range.setEnd(en, eo);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    /* caret restore is best-effort */
  }
}

export default function LiveMarkdown({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = render(value);

    let raf = 0;

    function sync() {
      raf = requestAnimationFrame(() => {
        if (document.activeElement !== el) return;
        const sel = window.getSelection();
        if (!sel.rangeCount || !el.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
        const range = sel.getRangeAt(0);
        const start = calcOffset(el, range.startContainer, range.startOffset);
        const end = range.collapsed ? null : calcOffset(el, range.endContainer, range.endOffset);
        const next = render(extract(el));
        if (next !== el.innerHTML) {
          el.innerHTML = next;
          setCaret(el, start, end);
        }
        markActiveBlock();
      });
    }

    function markActiveBlock() {
      const prev = el.querySelector(".mk-active");
      if (prev) prev.classList.remove("mk-active");
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const blk = node?.closest?.("[data-blk]");
      if (blk && el.contains(blk)) blk.classList.add("mk-active");
    }

    function onInput() {
      onChangeRef.current(extract(el));
      sync();
    }

    function onPaste(e) {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }

    function onSelection() {
      if (document.activeElement === el) markActiveBlock();
    }

    el.addEventListener("input", onInput);
    el.addEventListener("paste", onPaste);
    document.addEventListener("selectionchange", onSelection);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("input", onInput);
      el.removeEventListener("paste", onPaste);
      document.removeEventListener("selectionchange", onSelection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className="live-editor"
      contentEditable
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-multiline="true"
      data-placeholder={placeholder}
    />
  );
}
