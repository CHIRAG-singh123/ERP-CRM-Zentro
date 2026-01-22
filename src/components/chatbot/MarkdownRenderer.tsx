import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownRenderer = React.memo<MarkdownRendererProps>(
  ({ content, isUser = false }) => {
    const components = useMemo<Components>(() => {
      return {
        // Code blocks with syntax highlighting
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const codeString = String(children).replace(/\n$/, '');

          // Code block (not inline)
          if (!inline) {
            // If language is specified, use syntax highlighter
            if (language) {
              return (
                <div className="relative my-3 rounded-lg overflow-hidden max-w-full w-full">
                  <div className="flex items-center justify-between bg-[#0D1117] px-3 py-1.5 border-b border-white/10">
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                      {language}
                    </span>
                  </div>
                  <div className="overflow-y-auto overflow-x-hidden max-h-[400px] w-full">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={language}
                      PreTag="div"
                      className="!m-0 !rounded-none"
                      customStyle={{
                        margin: 0,
                        padding: '0.75rem',
                        background: '#0D1117',
                        fontSize: '0.75rem',
                        lineHeight: '1.5',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                      }}
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }
            
            // Code block without language - render as plain code block
            return (
              <div className="relative my-3 rounded-lg overflow-hidden max-w-full w-full">
                <pre
                  className={`block w-full max-w-full overflow-y-auto overflow-x-hidden bg-[#0D1117] px-3 py-2 rounded-lg border border-white/10 text-xs font-mono max-h-[400px] ${
                    isUser ? 'text-[#A8DADC]' : 'text-white/90'
                  }`}
                  {...props}
                >
                  <code className="block">{codeString}</code>
                </pre>
              </div>
            );
          }

          // Inline code
          return (
            <code
              className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${
                isUser
                  ? 'bg-[#1F1F21]/80 text-[#A8DADC]'
                  : 'bg-[#1F1F21] text-[#A8DADC]'
              }`}
              {...props}
            >
              {children}
            </code>
          );
        },

        // Paragraphs
        p({ children, ...props }: any) {
          return (
            <p className="mb-2 last:mb-0 leading-relaxed break-words overflow-wrap-anywhere" {...props}>
              {children}
            </p>
          );
        },

        // Headings
        h1({ children, ...props }: any) {
          return (
            <h1
              className="text-xl font-bold mt-4 mb-2 first:mt-0 text-white break-words"
              {...props}
            >
              {children}
            </h1>
          );
        },
        h2({ children, ...props }: any) {
          return (
            <h2
              className="text-lg font-semibold mt-3 mb-2 first:mt-0 text-white break-words"
              {...props}
            >
              {children}
            </h2>
          );
        },
        h3({ children, ...props }: any) {
          return (
            <h3
              className="text-base font-semibold mt-3 mb-1.5 first:mt-0 text-white break-words"
              {...props}
            >
              {children}
            </h3>
          );
        },
        h4({ children, ...props }: any) {
          return (
            <h4
              className="text-sm font-semibold mt-2 mb-1 first:mt-0 text-white break-words"
              {...props}
            >
              {children}
            </h4>
          );
        },
        h5({ children, ...props }: any) {
          return (
            <h5
              className="text-sm font-medium mt-2 mb-1 first:mt-0 text-white/90 break-words"
              {...props}
            >
              {children}
            </h5>
          );
        },
        h6({ children, ...props }: any) {
          return (
            <h6
              className="text-xs font-medium mt-2 mb-1 first:mt-0 text-white/80 break-words"
              {...props}
            >
              {children}
            </h6>
          );
        },

        // Lists
        ul({ children, ...props }: any) {
          return (
            <ul
              className="list-disc list-inside my-2 space-y-1 ml-4 text-white/90"
              {...props}
            >
              {children}
            </ul>
          );
        },
        ol({ children, ...props }: any) {
          return (
            <ol
              className="list-decimal list-inside my-2 space-y-1 ml-4 text-white/90"
              {...props}
            >
              {children}
            </ol>
          );
        },
        li({ children, ...props }: any) {
          return (
            <li className="leading-relaxed pl-1 break-words" {...props}>
              {children}
            </li>
          );
        },

        // Links
        a({ href, children, ...props }: any) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A8DADC] hover:text-[#B39CD0] underline underline-offset-2 transition-colors duration-200 break-words"
              {...props}
            >
              {children}
            </a>
          );
        },

        // Blockquotes
        blockquote({ children, ...props }: any) {
          return (
            <blockquote
              className="border-l-4 border-[#A8DADC]/50 bg-[#1F1F21]/50 pl-4 py-2 my-3 italic text-white/80 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          );
        },

        // Tables
        table({ children, ...props }: any) {
          return (
            <div className="overflow-x-auto my-3 rounded-lg border border-white/10 max-w-full">
              <table
                className="w-full border-collapse text-sm min-w-full"
                {...props}
              >
                {children}
              </table>
            </div>
          );
        },
        thead({ children, ...props }: any) {
          return (
            <thead className="bg-[#1F1F21] border-b border-white/10" {...props}>
              {children}
            </thead>
          );
        },
        tbody({ children, ...props }: any) {
          return <tbody className="divide-y divide-white/5" {...props}>{children}</tbody>;
        },
        tr({ children, ...props }: any) {
          return (
            <tr className="hover:bg-[#1F1F21]/50 transition-colors" {...props}>
              {children}
            </tr>
          );
        },
        th({ children, ...props }: any) {
          return (
            <th
              className="px-4 py-2 text-left font-semibold text-white border-r border-white/5 last:border-r-0"
              {...props}
            >
              {children}
            </th>
          );
        },
        td({ children, ...props }: any) {
          return (
            <td
              className="px-4 py-2 text-white/90 border-r border-white/5 last:border-r-0"
              {...props}
            >
              {children}
            </td>
          );
        },

        // Horizontal rule
        hr({ ...props }: any) {
          return (
            <hr
              className="my-4 border-0 border-t border-white/10"
              {...props}
            />
          );
        },

        // Strong/Bold
        strong({ children, ...props }: any) {
          return (
            <strong className="font-semibold text-white" {...props}>
              {children}
            </strong>
          );
        },

        // Emphasis/Italic
        em({ children, ...props }: any) {
          return (
            <em className="italic text-white/90" {...props}>
              {children}
            </em>
          );
        },

        // Strikethrough
        del({ children, ...props }: any) {
          return (
            <del className="line-through text-white/60" {...props}>
              {children}
            </del>
          );
        },
      };
    }, [isUser]);

    return (
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if content or isUser changes
    return prevProps.content === nextProps.content && prevProps.isUser === nextProps.isUser;
  }
);

MarkdownRenderer.displayName = 'MarkdownRenderer';
