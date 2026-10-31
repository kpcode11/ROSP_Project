import posixpath
from dataclasses import dataclass, field
from app.schemas.graph import GraphEdge, GraphNode, NodeMetrics
from app.services.parser.extractors import FileExtractionResult


@dataclass
class SymbolTable:
    file_paths: set[str] = field(default_factory=set)
    nodes_by_id: dict[str, GraphNode] = field(default_factory=dict)
    symbols_by_name: dict[str, list[GraphNode]] = field(default_factory=dict)
    file_exports: dict[str, dict[str, GraphNode]] = field(default_factory=dict)

    def register_node(self, node: GraphNode) -> None:
        self.nodes_by_id[node.id] = node
        if node.type == "file":
            self.file_paths.add(node.file_path)
            return

        self.symbols_by_name.setdefault(node.label, []).append(node)
        self.file_exports.setdefault(node.file_path, {})[node.label] = node

        # Also index method short name if qualified (e.g. User.findOne -> findOne)
        if "." in node.label:
            short = node.label.split(".")[-1]
            self.symbols_by_name.setdefault(short, []).append(node)
            self.file_exports.setdefault(node.file_path, {})[short] = node


class CrossFileResolver:
    """Resolves cross-file imports, function/method calls, API route handlers, and model queries."""

    def __init__(self, extractions: dict[str, FileExtractionResult]) -> None:
        self.extractions = extractions
        self.symbol_table = SymbolTable()
        self.edges: list[GraphEdge] = []
        self._edge_keys: set[tuple[str, str, str]] = set()
        # Maps (importer_file_path, imported_symbol_name) -> resolved_target_file_path
        self.imported_symbols: dict[tuple[str, str], str] = {}

    def _add_edge(
        self,
        source: str,
        target: str,
        relation: str,
        confidence: float = 1.0,
        line: int = 1,
    ) -> None:
        if source == target:
            return
        if source not in self.symbol_table.nodes_by_id or target not in self.symbol_table.nodes_by_id:
            return
        key = (source, target, relation)
        if key in self._edge_keys:
            return
        self._edge_keys.add(key)
        self.edges.append(
            GraphEdge(
                source=source,
                target=target,
                relation=relation,  # type: ignore[arg-type]
                confidence=confidence,
                line=line,
            )
        )

    def build_symbol_table(self) -> SymbolTable:
        for fp, ext in self.extractions.items():
            file_node = GraphNode(
                id=fp,
                label=fp.split("/")[-1],
                type="file",
                file_path=fp,
                language=ext.language,
                line_start=1,
                line_end=ext.line_count,
                signature=fp,
                metrics=NodeMetrics(loc=ext.line_count),
            )
            self.symbol_table.register_node(file_node)

            for cls in ext.classes:
                cls_id = f"{fp}::{cls.name}"
                ntype = "model" if cls.is_model else "class"
                cls_node = GraphNode(
                    id=cls_id,
                    label=cls.name,
                    type=ntype,
                    file_path=fp,
                    language=ext.language,
                    line_start=cls.line_start,
                    line_end=cls.line_end,
                    signature=cls.signature,
                    docstring=cls.docstring,
                    parent_id=fp,
                    metrics=NodeMetrics(loc=max(1, cls.line_end - cls.line_start + 1)),
                )
                self.symbol_table.register_node(cls_node)
                self._add_edge(fp, cls_id, "DECLARES", confidence=1.0, line=cls.line_start)

            for fn in ext.functions:
                fn_id = f"{fp}::{fn.qualified_name}"
                ntype = "method" if fn.is_method else "function"
                parent_id = f"{fp}::{fn.parent_class}" if fn.parent_class else fp
                fn_node = GraphNode(
                    id=fn_id,
                    label=fn.qualified_name,
                    type=ntype,
                    file_path=fp,
                    language=ext.language,
                    line_start=fn.line_start,
                    line_end=fn.line_end,
                    signature=fn.signature,
                    docstring=fn.docstring,
                    parameters=fn.parameters,
                    parent_id=parent_id,
                    metrics=NodeMetrics(loc=max(1, fn.line_end - fn.line_start + 1)),
                )
                self.symbol_table.register_node(fn_node)
                decl_source = (
                    parent_id if parent_id in self.symbol_table.nodes_by_id else fp
                )
                self._add_edge(decl_source, fn_id, "DECLARES", confidence=1.0, line=fn.line_start)

            for ep in ext.api_endpoints:
                ep_id = ep.name
                ep_node = GraphNode(
                    id=ep_id,
                    label=ep.name,
                    type="api_endpoint",
                    file_path=fp,
                    language=ext.language,
                    line_start=ep.line_start,
                    line_end=ep.line_end,
                    signature=ep.code,
                    docstring=f"{ep.http_method} {ep.route_path}",
                    parent_id=fp,
                    metrics=NodeMetrics(loc=1),
                )
                self.symbol_table.register_node(ep_node)
                self._add_edge(fp, ep_id, "DECLARES", confidence=1.0, line=ep.line_start)

        return self.symbol_table

    def resolve_import_path(self, importer_file: str, module_str: str) -> str | None:
        all_files = self.symbol_table.file_paths

        # 1. Relative JS/TS import: ./foo or ../services/userService
        if module_str.startswith("."):
            base_dir = posixpath.dirname(importer_file)
            candidate_base = posixpath.normpath(posixpath.join(base_dir, module_str))
            for ext in ("", ".js", ".jsx", ".ts", ".tsx", ".py", "/index.js", "/index.ts", "/__init__.py"):
                cand = candidate_base + ext
                if cand in all_files:
                    return cand

        # 2. Python dotted path: analytics.scorer
        dotted_as_path = module_str.replace(".", "/")
        for ext in ("", ".py", "/__init__.py", ".js", ".ts", ".java"):
            cand = dotted_as_path + ext
            if cand in all_files:
                return cand

        # 3. Suffix match for Java or monorepo imports
        for fp in all_files:
            if fp.endswith(f"/{dotted_as_path}.py") or fp.endswith(f"/{dotted_as_path}.js") or fp.endswith(f"/{dotted_as_path}.ts") or fp.endswith(f"/{dotted_as_path}.java"):
                return fp

        return None

    def resolve_all(self) -> tuple[list[GraphNode], list[GraphEdge]]:
        self.build_symbol_table()

        # Pass 1: Resolve imports
        for fp, ext in self.extractions.items():
            for imp in ext.imports:
                target_file = self.resolve_import_path(fp, imp.module)
                if target_file:
                    self._add_edge(fp, target_file, "IMPORTS", confidence=1.0, line=imp.line)
                    for sym in imp.symbols:
                        self.imported_symbols[(fp, sym)] = target_file

        # Pass 2: Resolve class inheritance
        for fp, ext in self.extractions.items():
            for cls in ext.classes:
                cls_id = f"{fp}::{cls.name}"
                for base_name in cls.bases:
                    target_node = self._resolve_symbol_in_context(fp, base_name)
                    if target_node:
                        self._add_edge(cls_id, target_node.id, "INHERITS", confidence=1.0, line=cls.line_start)

        # Pass 3: Resolve API Endpoint handlers (ROUTES_TO)
        for fp, ext in self.extractions.items():
            for ep in ext.api_endpoints:
                for handler_name in ep.handlers:
                    target_node = self._resolve_symbol_in_context(fp, handler_name)
                    if target_node:
                        self._add_edge(
                            ep.name,
                            target_node.id,
                            "ROUTES_TO",
                            confidence=1.0,
                            line=ep.line_start,
                        )

        # Pass 4: Resolve function/method calls and model queries
        for fp, ext in self.extractions.items():
            for call in ext.calls:
                caller_id = f"{fp}::{call.caller}" if call.caller != "<module>" else fp
                if caller_id not in self.symbol_table.nodes_by_id:
                    caller_id = fp

                # Case A: Object/Class method call like User.findOne(...) or userService.authenticate(...)
                if call.object_name:
                    obj_target_file = self.imported_symbols.get((fp, call.object_name))
                    if obj_target_file:
                        # Check if object_name is a Model or Class in obj_target_file
                        cls_or_model_id = f"{obj_target_file}::{call.object_name}"
                        if cls_or_model_id in self.symbol_table.nodes_by_id:
                            target_cls_node = self.symbol_table.nodes_by_id[cls_or_model_id]
                            if target_cls_node.type == "model":
                                self._add_edge(
                                    caller_id,
                                    target_cls_node.id,
                                    "QUERIES",
                                    confidence=1.0,
                                    line=call.line,
                                )
                        # Check for method on that class/model or function in that module
                        qual_method_id = f"{obj_target_file}::{call.object_name}.{call.method_name}"
                        direct_fn_id = f"{obj_target_file}::{call.method_name}"
                        if qual_method_id in self.symbol_table.nodes_by_id:
                            self._add_edge(
                                caller_id,
                                qual_method_id,
                                "CALLS",
                                confidence=1.0,
                                line=call.line,
                            )
                            continue
                        if direct_fn_id in self.symbol_table.nodes_by_id:
                            self._add_edge(
                                caller_id,
                                direct_fn_id,
                                "CALLS",
                                confidence=1.0,
                                line=call.line,
                            )
                            continue

                # Case B: Direct symbol call like authenticate(...) or compute_velocity_score(...)
                target_node, conf = self._resolve_callable(fp, call.callee, call.method_name)
                if target_node:
                    rel = "QUERIES" if target_node.type == "model" else "CALLS"
                    self._add_edge(caller_id, target_node.id, rel, confidence=conf, line=call.line)

        return list(self.symbol_table.nodes_by_id.values()), self.edges

    def _resolve_symbol_in_context(self, file_path: str, symbol_name: str) -> GraphNode | None:
        # 1. Imported symbol
        target_file = self.imported_symbols.get((file_path, symbol_name))
        if target_file:
            exports = self.symbol_table.file_exports.get(target_file, {})
            if symbol_name in exports:
                return exports[symbol_name]

        # 2. Same file declaration
        local_exports = self.symbol_table.file_exports.get(file_path, {})
        if symbol_name in local_exports:
            return local_exports[symbol_name]

        # 3. Global symbol match
        candidates = self.symbol_table.symbols_by_name.get(symbol_name, [])
        if len(candidates) == 1:
            return candidates[0]
        return None

    def _resolve_callable(
        self, file_path: str, callee: str, method_name: str
    ) -> tuple[GraphNode | None, float]:
        # 1. Explicit import of method_name
        target_file = self.imported_symbols.get((file_path, method_name))
        if target_file:
            exports = self.symbol_table.file_exports.get(target_file, {})
            if method_name in exports:
                return exports[method_name], 1.0

        # 2. Same-file function/method
        local_exports = self.symbol_table.file_exports.get(file_path, {})
        if callee in local_exports:
            return local_exports[callee], 1.0
        if method_name in local_exports:
            return local_exports[method_name], 1.0

        # 3. Unique repository-wide symbol match
        candidates = self.symbol_table.symbols_by_name.get(callee, []) or self.symbol_table.symbols_by_name.get(
            method_name, []
        )
        if len(candidates) == 1:
            return candidates[0], 0.7

        return None, 0.0

