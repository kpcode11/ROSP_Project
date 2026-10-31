import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeIntel — Local-First Codebase Intelligence Platform",
  description:
    "AST Knowledge Graph, Semantic Code Search, Grounded Hybrid GraphRAG & Change Impact Analyzer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}

