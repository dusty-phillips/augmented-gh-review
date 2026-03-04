export function highlight_line(code, language) {
  const h = globalThis.hljs || (typeof window !== 'undefined' && window.hljs);
  if (!h || !language || language === '') {
    return escapeHtml(code);
  }

  try {
    const result = h.highlight(code, { language: language, ignoreIllegals: true });
    return result.value;
  } catch (e) {
    try {
      const result = h.highlightAuto(code);
      return result.value;
    } catch (e2) {
      return escapeHtml(code);
    }
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Map file extensions to highlight.js language names
export function detect_language(file_path) {
  // Strip " (+N more)" suffix from multi-file chunks
  const clean_path = file_path.replace(/\s*\(\+\d+ more\)$/, '');
  const ext = clean_path.split('.').pop()?.toLowerCase() || '';
  const map = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'kt': 'kotlin',
    'swift': 'swift',
    'gleam': 'erlang',  // closest match
    'ex': 'elixir',
    'exs': 'elixir',
    'erl': 'erlang',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'xml': 'xml',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'bash',
    'toml': 'ini',
    'dockerfile': 'dockerfile',
    'graphql': 'graphql',
    'gql': 'graphql',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
  };
  return map[ext] || '';
}
