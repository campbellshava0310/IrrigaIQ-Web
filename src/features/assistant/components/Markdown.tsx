import { Anchor, Code, List, Stack, Text } from '@mantine/core';
import { Fragment, type ReactNode } from 'react';

import { parseBlocks } from '../markdown';

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;

/** Bold, italic, code and links. Only http(s) links render as links; nothing renders as HTML. */
function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <b key={index}>{part.slice(2, -2)}</b>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <Code key={index}>{part.slice(1, -1)}</Code>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = link[2] ?? '';
      return /^https?:\/\//.test(href) ? (
        <Anchor key={index} href={href} target="_blank" rel="noopener noreferrer" inherit>
          {link[1]}
        </Anchor>
      ) : (
        <Fragment key={index}>{link[1]}</Fragment>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <i key={index}>{part.slice(1, -1)}</i>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  return (
    <Stack gap={8}>
      {parseBlocks(text).map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <Text key={index} size="sm" fw={600}>
              {renderInline(block.text)}
            </Text>
          );
        }
        if (block.kind === 'list') {
          return (
            <List
              key={index}
              size="sm"
              spacing={4}
              type={block.ordered ? 'ordered' : 'unordered'}
              withPadding
            >
              {block.items.map((item, itemIndex) => (
                <List.Item key={itemIndex}>{renderInline(item)}</List.Item>
              ))}
            </List>
          );
        }
        return (
          <Text key={index} size="sm" lh={1.6}>
            {renderInline(block.text)}
          </Text>
        );
      })}
    </Stack>
  );
}
