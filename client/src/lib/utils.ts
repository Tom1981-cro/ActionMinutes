import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ExtractedAction {
  text: string;
  lineNumber: number;
  keyword: 'Action' | 'TODO' | 'Task';
  fullLine: string;
}

/**
 * Extracts action items from text by looking for lines starting with Action:, TODO:, or Task:
 * @param text - The text to search for actions
 * @returns An array of extracted actions with their line numbers and keywords
 */
export function extractActionsFromText(text: string): ExtractedAction[] {
  const lines = text.split('\n');
  const actions: ExtractedAction[] = [];
  
  const actionRegex = /^\s*(Action|TODO|Task):\s*(.+)/i;
  
  lines.forEach((line, index) => {
    const match = line.match(actionRegex);
    if (match) {
      const keyword = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      actions.push({
        text: match[2].trim(),
        lineNumber: index + 1,
        keyword: keyword as 'Action' | 'TODO' | 'Task',
        fullLine: line,
      });
    }
  });
  
  return actions;
}

/**
 * Highlights lines containing action keywords by wrapping them with styled spans
 * Returns HTML string for rendering in a preview overlay
 */
export function highlightActionsInText(text: string): { html: string; hasActions: boolean } {
  const lines = text.split('\n');
  const actionRegex = /^\s*(Action|TODO|Task):\s*/i;
  let hasActions = false;
  
  const highlightedLines = lines.map((line) => {
    if (actionRegex.test(line)) {
      hasActions = true;
      return `<span class="action-highlight">${escapeHtml(line)}</span>`;
    }
    return escapeHtml(line);
  });
  
  return { html: highlightedLines.join('\n'), hasActions };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
