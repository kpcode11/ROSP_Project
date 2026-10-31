import type { Metadata, Viewport } from "next";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeIntel — Local-First Codebase Intelligence Platform",
  description:
    "AST Knowledge Graph, Semantic Code Search, Grounded Hybrid GraphRAG & Change Impact Analyzer",
};

export const viewport: Viewport = {
  themeColor: "#121212",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-fg font-ui antialiased min-h-[100dvh] flex flex-col">
        {children}
      </body>
    </html>
  );
}
