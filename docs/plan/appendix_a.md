## Appendix A — AST Extraction & Graph Relationship Specifications

| Language | Function / Method AST Nodes | Class AST Nodes | Import AST Nodes | Call AST Nodes |
| :--- | :--- | :--- | :--- | :--- |
| **Python** | `function_definition` | `class_definition` | `import_statement`, `import_from_statement` | `call` |
| **JavaScript / TypeScript** | `function_declaration`, `method_definition`, `arrow_function` (assigned to `variable_declarator`) | `class_declaration` | `import_statement`, `call_expression` (`require`) | `call_expression` |
| **Java** | `method_declaration`, `constructor_declaration` | `class_declaration`, `interface_declaration` | `import_declaration` | `method_invocation` |

---

