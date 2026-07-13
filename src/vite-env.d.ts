/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module 'prismjs' {
  const Prism: {
    highlight: (text: string, grammar: unknown, language: string) => string;
    highlightElement: (element: Element, async?: boolean, callback?: () => void) => void;
    languages: Record<string, unknown>;
    tokenize: (text: string, grammar: unknown) => unknown[];
  };
  export default Prism;
}
