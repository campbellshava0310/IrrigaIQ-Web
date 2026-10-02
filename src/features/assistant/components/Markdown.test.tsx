import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { parseBlocks } from '../markdown';

import { Markdown } from './Markdown';

const renderWithProviders = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

describe('parseBlocks', () => {
  it('splits paragraphs, headings and lists', () => {
    expect(
      parseBlocks(
        'Block A needs water.\n\n## Why\n- 68% depleted\n- hot and dry\n\n1. Plan it\n2. Check',
      ),
    ).toEqual([
      { kind: 'paragraph', text: 'Block A needs water.' },
      { kind: 'heading', text: 'Why' },
      { kind: 'list', ordered: false, items: ['68% depleted', 'hot and dry'] },
      { kind: 'list', ordered: true, items: ['Plan it', 'Check'] },
    ]);
  });

  it('keeps a streamed partial answer readable', () => {
    expect(parseBlocks('The root zone is')).toEqual([
      { kind: 'paragraph', text: 'The root zone is' },
    ]);
  });
});

describe('Markdown', () => {
  it('renders emphasis and safe links, never raw HTML', () => {
    renderWithProviders(
      <Markdown
        text={'**68%** depleted, see [FAO-56](https://www.fao.org) <img src=x onerror=alert(1)>'}
      />,
    );
    expect(screen.getByText('68%').tagName).toBe('B');
    expect(screen.getByRole('link', { name: 'FAO-56' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows javascript: links as plain text', () => {
    renderWithProviders(<Markdown text={'[click](javascript:alert(1))'} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/click/)).toBeInTheDocument();
  });
});
