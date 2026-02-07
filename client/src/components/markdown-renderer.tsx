import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      nodes.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5]) {
      nodes.push(<code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{match[6]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      elements.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-foreground mt-4 mb-1.5">
          {parseInline(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-base font-semibold text-foreground mt-5 mb-2 pb-1 border-b border-border/50">
          {parseInline(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="text-lg font-bold text-foreground mt-3 mb-2">
          {parseInline(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
      elements.push(<hr key={key++} className="my-3 border-border/50" />);
      i++;
      continue;
    }

    if (/^[-*•]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const itemLine = lines[i].trim();
        if (/^[-*•]\s/.test(itemLine)) {
          items.push(
            <li key={items.length} className="text-sm text-foreground leading-relaxed pl-1">
              {parseInline(itemLine.replace(/^[-*•]\s+/, ''))}
            </li>
          );
          i++;
        } else if (itemLine === '') {
          break;
        } else {
          break;
        }
      }
      elements.push(
        <ul key={key++} className="list-disc list-outside ml-5 space-y-1 my-1.5">
          {items}
        </ul>
      );
      continue;
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const itemLine = lines[i].trim();
        if (/^\d+[.)]\s/.test(itemLine)) {
          items.push(
            <li key={items.length} className="text-sm text-foreground leading-relaxed pl-1">
              {parseInline(itemLine.replace(/^\d+[.)]\s+/, ''))}
            </li>
          );
          i++;
        } else if (itemLine === '') {
          break;
        } else {
          break;
        }
      }
      elements.push(
        <ol key={key++} className="list-decimal list-outside ml-5 space-y-1 my-1.5">
          {items}
        </ol>
      );
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-l-3 border-primary/40 pl-3 my-2 text-sm text-muted-foreground italic">
          {quoteLines.map((ql, qi) => (
            <span key={qi}>{parseInline(ql)}{qi < quoteLines.length - 1 && <br />}</span>
          ))}
        </blockquote>
      );
      continue;
    }

    elements.push(
      <p key={key++} className="text-sm text-foreground leading-relaxed my-1">
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  return (
    <div className={`markdown-content ${className}`} data-testid="markdown-renderer">
      {elements}
    </div>
  );
}