from dataclasses import dataclass, field
import re
import tree_sitter
from app.services.parser.tree_sitter_engine import engine


@dataclass
class ExtractedClass:
    name: str
    line_start: int
    line_end: int
    bases: list[str] = field(default_factory=list)
    docstring: str = ""
    signature: str = ""
    code: str = ""
    is_model: bool = False


@dataclass
class ExtractedFunction:
    name: str
    qualified_name: str
    line_start: int
    line_end: int
    parameters: list[str] = field(default_factory=list)
    parent_class: str | None = None
    docstring: str = ""
    signature: str = ""
    code: str = ""
    is_method: bool = False


@dataclass
class ExtractedImport:
    module: str
    symbols: list[str] = field(default_factory=list)
    line: int = 1
    raw: str = ""


@dataclass
class ExtractedCall:
    caller: str
    callee: str
    object_name: str | None
    method_name: str
    line: int


@dataclass
class ExtractedAPIEndpoint:
    http_method: str
    route_path: str
    name: str
    handlers: list[str] = field(default_factory=list)
    line_start: int = 1
    line_end: int = 1
    code: str = ""


@dataclass
class FileExtractionResult:
    file_path: str
    language: str
    line_count: int
    classes: list[ExtractedClass] = field(default_factory=list)
    functions: list[ExtractedFunction] = field(default_factory=list)
    imports: list[ExtractedImport] = field(default_factory=list)
    calls: list[ExtractedCall] = field(default_factory=list)
    api_endpoints: list[ExtractedAPIEndpoint] = field(default_factory=list)


def _node_text(node: tree_sitter.Node | None, source_bytes: bytes) -> str:
    if node is None:
        return ""
    return source_bytes[node.start_byte : node.end_byte].decode("utf-8", errors="replace")


def _clean_comment(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("/**") and cleaned.endswith("*/"):
        cleaned = cleaned[3:-2]
    elif cleaned.startswith("/*") and cleaned.endswith("*/"):
        cleaned = cleaned[2:-2]
    lines = []
    for line in cleaned.splitlines():
        line = re.sub(r"^\s*[\*#//]+\s?", "", line).strip()
        if line:
            lines.append(line)
    return " ".join(lines)


def _get_preceding_comment(node: tree_sitter.Node, source_bytes: bytes) -> str:
    curr = node.prev_sibling
    comments = []
    while curr is not None:
        if curr.type == "comment":
            comments.append(_clean_comment(_node_text(curr, source_bytes)))
            curr = curr.prev_sibling
        else:
            break
    if not comments and node.parent and node.parent.type in (
        "export_statement",
        "lexical_declaration",
        "variable_declaration",
        "decorated_definition",
    ):
        return _get_preceding_comment(node.parent, source_bytes)
    return " ".join(reversed(comments))


def _get_python_docstring(body_node: tree_sitter.Node | None, source_bytes: bytes) -> str:
    if body_node is None:
        return ""
    for child in body_node.named_children:
        if child.type == "expression_statement" and child.named_child_count > 0:
            sub = child.named_children[0]
            if sub.type == "string":
                raw = _node_text(sub, source_bytes).strip()
                for quote in ('"""', "'''", '"', "'"):
                    if raw.startswith(quote) and raw.endswith(quote) and len(raw) >= 2 * len(quote):
                        return " ".join(
                            line.strip() for line in raw[len(quote) : -len(quote)].splitlines() if line.strip()
                        )
        break
    return ""


def _extract_params(params_node: tree_sitter.Node | None, source_bytes: bytes) -> list[str]:
    if params_node is None:
        return []
    raw = _node_text(params_node, source_bytes).strip()
    if raw.startswith("(") and raw.endswith(")"):
        raw = raw[1:-1]
    if not raw.strip():
        return []
    params = []
    for part in raw.split(","):
        p = part.strip()
        if not p:
            continue
        # Strip type annotations and defaults
        p = p.split(":")[0].split("=")[0].strip()
        # Handle Java Type paramName
        tokens = p.split()
        if len(tokens) >= 2:
            p = tokens[-1]
        if p and p not in ("self", "cls"):
            params.append(p)
    return params


def _first_line_signature(node: tree_sitter.Node, source_bytes: bytes) -> str:
    text = _node_text(node, source_bytes).strip()
    first_line = text.splitlines()[0].strip() if text else ""
    return first_line.rstrip("{").rstrip(":").strip()


def _is_model_class(file_path: str, class_name: str, bases: list[str], source_text: str) -> bool:
    fp_lower = file_path.lower()
    if "/models/" in f"/{fp_lower}" or fp_lower.startswith("models/"):
        return True
    model_bases = {"Model", "Base", "Document", "DeclarativeBase", "SQLModel", "Entity"}
    if any(b in model_bases for b in bases):
        return True
    if "@Entity" in source_text or "@Table" in source_text:
        return True
    if ("mongoose" in source_text or "sqlalchemy" in source_text) and class_name in ("User", "Order", "Product"):
        return True
    return False


def extract_file_entities(file_path: str, source_code: str, language: str) -> FileExtractionResult:
    source_bytes = source_code.encode("utf-8")
    tree = engine.parse(source_bytes, language, file_path)
    lines = source_code.splitlines()
    result = FileExtractionResult(
        file_path=file_path,
        language=language,
        line_count=len(lines) or 1,
    )

    if language == "python":
        _extract_python(tree.root_node, source_bytes, source_code, file_path, result)
    elif language in ("javascript", "typescript"):
        _extract_js_ts(tree.root_node, source_bytes, source_code, file_path, result)
    elif language == "java":
        _extract_java(tree.root_node, source_bytes, source_code, file_path, result)

    return result


def _extract_python(
    root: tree_sitter.Node,
    source_bytes: bytes,
    source_code: str,
    file_path: str,
    result: FileExtractionResult,
) -> None:
    def walk(node: tree_sitter.Node, current_class: str | None = None, current_func: str | None = None) -> None:
        if node.type == "import_statement":
            raw = _node_text(node, source_bytes).strip()
            # e.g. import os, sys
            m = re.match(r"import\s+(.+)", raw)
            if m:
                mods = [part.strip().split(" as ")[0].strip() for part in m.group(1).split(",")]
                for mod in mods:
                    result.imports.append(
                        ExtractedImport(
                            module=mod,
                            symbols=[mod.split(".")[-1]],
                            line=node.start_point[0] + 1,
                            raw=raw,
                        )
                    )
        elif node.type == "import_from_statement":
            raw = _node_text(node, source_bytes).strip()
            m = re.match(r"from\s+([\w\.]+)\s+import\s+(.+)", raw)
            if m:
                mod = m.group(1).strip()
                syms_raw = m.group(2).strip().strip("()")
                syms = [
                    s.strip().split(" as ")[0].strip()
                    for s in syms_raw.split(",")
                    if s.strip()
                ]
                result.imports.append(
                    ExtractedImport(
                        module=mod,
                        symbols=syms,
                        line=node.start_point[0] + 1,
                        raw=raw,
                    )
                )

        elif node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            super_node = node.child_by_field_name("superclasses")
            body_node = node.child_by_field_name("body")
            cls_name = _node_text(name_node, source_bytes)
            bases = _extract_params(super_node, source_bytes)
            doc = _get_python_docstring(body_node, source_bytes) or _get_preceding_comment(node, source_bytes)
            is_mod = _is_model_class(file_path, cls_name, bases, source_code)
            result.classes.append(
                ExtractedClass(
                    name=cls_name,
                    line_start=node.start_point[0] + 1,
                    line_end=node.end_point[0] + 1,
                    bases=bases,
                    docstring=doc,
                    signature=_first_line_signature(node, source_bytes),
                    code=_node_text(node, source_bytes),
                    is_model=is_mod,
                )
            )
            for child in node.children:
                walk(child, current_class=cls_name, current_func=current_func)
            return

        elif node.type == "function_definition":
            name_node = node.child_by_field_name("name")
            params_node = node.child_by_field_name("parameters")
            body_node = node.child_by_field_name("body")
            fn_name = _node_text(name_node, source_bytes)
            qual_name = f"{current_class}.{fn_name}" if current_class else fn_name
            doc = _get_python_docstring(body_node, source_bytes) or _get_preceding_comment(node, source_bytes)

            # Check decorator for FastAPI / Flask route
            if node.parent and node.parent.type == "decorated_definition":
                for sibling in node.parent.children:
                    if sibling.type == "decorator":
                        dec_text = _node_text(sibling, source_bytes)
                        m_route = re.search(
                            r"@\w+\.(get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]",
                            dec_text,
                            re.IGNORECASE,
                        )
                        if m_route:
                            verb = m_route.group(1).upper()
                            rpath = m_route.group(2)
                            result.api_endpoints.append(
                                ExtractedAPIEndpoint(
                                    http_method=verb,
                                    route_path=rpath,
                                    name=f"{verb} {rpath}",
                                    handlers=[qual_name],
                                    line_start=sibling.start_point[0] + 1,
                                    line_end=node.end_point[0] + 1,
                                    code=dec_text,
                                )
                            )

            result.functions.append(
                ExtractedFunction(
                    name=fn_name,
                    qualified_name=qual_name,
                    line_start=node.start_point[0] + 1,
                    line_end=node.end_point[0] + 1,
                    parameters=_extract_params(params_node, source_bytes),
                    parent_class=current_class,
                    docstring=doc,
                    signature=_first_line_signature(node, source_bytes),
                    code=_node_text(node, source_bytes),
                    is_method=current_class is not None,
                )
            )
            for child in node.children:
                walk(child, current_class=current_class, current_func=qual_name)
            return

        elif node.type == "call":
            func_node = node.child_by_field_name("function")
            callee_raw = _node_text(func_node, source_bytes).strip()
            if callee_raw:
                obj_name = None
                method_name = callee_raw
                if "." in callee_raw:
                    parts = callee_raw.split(".")
                    obj_name = parts[0]
                    method_name = parts[-1]
                result.calls.append(
                    ExtractedCall(
                        caller=current_func or "<module>",
                        callee=callee_raw,
                        object_name=obj_name,
                        method_name=method_name,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            walk(child, current_class=current_class, current_func=current_func)

    walk(root)


def _extract_js_ts(
    root: tree_sitter.Node,
    source_bytes: bytes,
    source_code: str,
    file_path: str,
    result: FileExtractionResult,
) -> None:
    def walk(node: tree_sitter.Node, current_class: str | None = None, current_func: str | None = None) -> None:
        # ES6 import statement
        if node.type == "import_statement":
            raw = _node_text(node, source_bytes).strip()
            m_src = re.search(r"from\s+['\"]([^'\"]+)['\"]", raw)
            if m_src:
                mod = m_src.group(1)
                syms: list[str] = []
                m_named = re.search(r"\{([^}]+)\}", raw)
                if m_named:
                    syms.extend(
                        s.strip().split(" as ")[0].strip()
                        for s in m_named.group(1).split(",")
                        if s.strip()
                    )
                m_def = re.match(r"import\s+([A-Za-z0-9_$]+)\s+from", raw)
                if m_def:
                    syms.append(m_def.group(1))
                result.imports.append(
                    ExtractedImport(
                        module=mod,
                        symbols=syms or [mod.split("/")[-1]],
                        line=node.start_point[0] + 1,
                        raw=raw,
                    )
                )

        # CommonJS require(...) inside variable_declarator
        elif node.type == "variable_declarator":
            name_node = node.child_by_field_name("name")
            val_node = node.child_by_field_name("value")
            val_text = _node_text(val_node, source_bytes).strip()
            lhs_text = _node_text(name_node, source_bytes).strip()

            m_req = re.match(r"^require\(\s*['\"]([^'\"]+)['\"]\s*\)", val_text)
            if m_req:
                mod = m_req.group(1)
                syms = []
                if lhs_text.startswith("{") and lhs_text.endswith("}"):
                    syms = [
                        s.strip().split(":")[0].strip()
                        for s in lhs_text[1:-1].split(",")
                        if s.strip()
                    ]
                elif lhs_text:
                    syms = [lhs_text]
                result.imports.append(
                    ExtractedImport(
                        module=mod,
                        symbols=syms,
                        line=node.start_point[0] + 1,
                        raw=_node_text(node, source_bytes).strip(),
                    )
                )

            # Arrow function or function expression assigned to variable
            if val_node and val_node.type in ("arrow_function", "function_expression"):
                fn_name = lhs_text
                params_node = val_node.child_by_field_name("parameters")
                doc = _get_preceding_comment(node, source_bytes)
                result.functions.append(
                    ExtractedFunction(
                        name=fn_name,
                        qualified_name=fn_name,
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1,
                        parameters=_extract_params(params_node, source_bytes),
                        parent_class=current_class,
                        docstring=doc,
                        signature=_first_line_signature(node, source_bytes),
                        code=_node_text(node, source_bytes),
                        is_method=False,
                    )
                )
                for child in val_node.children:
                    walk(child, current_class=current_class, current_func=fn_name)
                return

        elif node.type == "class_declaration":
            name_node = node.child_by_field_name("name")
            cls_name = _node_text(name_node, source_bytes)
            bases: list[str] = []
            for child in node.children:
                if child.type == "class_heritage":
                    heritage_txt = _node_text(child, source_bytes)
                    m_ext = re.search(r"extends\s+([A-Za-z0-9_$\.]+)", heritage_txt)
                    if m_ext:
                        bases.append(m_ext.group(1))
            doc = _get_preceding_comment(node, source_bytes)
            is_mod = _is_model_class(file_path, cls_name, bases, source_code)
            result.classes.append(
                ExtractedClass(
                    name=cls_name,
                    line_start=node.start_point[0] + 1,
                    line_end=node.end_point[0] + 1,
                    bases=bases,
                    docstring=doc,
                    signature=_first_line_signature(node, source_bytes),
                    code=_node_text(node, source_bytes),
                    is_model=is_mod,
                )
            )
            for child in node.children:
                walk(child, current_class=cls_name, current_func=current_func)
            return

        elif node.type in ("function_declaration", "method_definition"):
            name_node = node.child_by_field_name("name")
            params_node = node.child_by_field_name("parameters")
            fn_name = _node_text(name_node, source_bytes)
            if fn_name and fn_name != "constructor":
                qual_name = f"{current_class}.{fn_name}" if current_class else fn_name
                doc = _get_preceding_comment(node, source_bytes)
                result.functions.append(
                    ExtractedFunction(
                        name=fn_name,
                        qualified_name=qual_name,
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1,
                        parameters=_extract_params(params_node, source_bytes),
                        parent_class=current_class,
                        docstring=doc,
                        signature=_first_line_signature(node, source_bytes),
                        code=_node_text(node, source_bytes),
                        is_method=current_class is not None or node.type == "method_definition",
                    )
                )
                for child in node.children:
                    walk(child, current_class=current_class, current_func=qual_name)
                return

        elif node.type == "call_expression":
            fn_node = node.child_by_field_name("function")
            args_node = node.child_by_field_name("arguments")
            callee_raw = _node_text(fn_node, source_bytes).strip()

            # Check Express route declaration: router.post('/login', loginUser)
            m_express = re.match(r"^(router|app)\.(get|post|put|delete|patch)$", callee_raw)
            if m_express and args_node and args_node.named_child_count >= 2:
                verb = m_express.group(2).upper()
                first_arg = _node_text(args_node.named_children[0], source_bytes).strip().strip("'\"`")
                handlers = []
                for arg_child in args_node.named_children[1:]:
                    if arg_child.type in ("identifier", "member_expression"):
                        handlers.append(_node_text(arg_child, source_bytes).strip())
                if first_arg.startswith("/"):
                    ep_name = f"{verb} {first_arg}"
                    result.api_endpoints.append(
                        ExtractedAPIEndpoint(
                            http_method=verb,
                            route_path=first_arg,
                            name=ep_name,
                            handlers=handlers,
                            line_start=node.start_point[0] + 1,
                            line_end=node.end_point[0] + 1,
                            code=_node_text(node, source_bytes).strip(),
                        )
                    )

            elif callee_raw and callee_raw != "require":
                obj_name = None
                method_name = callee_raw
                if "." in callee_raw:
                    parts = callee_raw.split(".")
                    obj_name = parts[0]
                    method_name = parts[-1]
                result.calls.append(
                    ExtractedCall(
                        caller=current_func or "<module>",
                        callee=callee_raw,
                        object_name=obj_name,
                        method_name=method_name,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            walk(child, current_class=current_class, current_func=current_func)

    walk(root)


def _extract_java(
    root: tree_sitter.Node,
    source_bytes: bytes,
    source_code: str,
    file_path: str,
    result: FileExtractionResult,
) -> None:
    def walk(node: tree_sitter.Node, current_class: str | None = None, current_func: str | None = None) -> None:
        if node.type == "import_declaration":
            raw = _node_text(node, source_bytes).strip().rstrip(";")
            m = re.match(r"import\s+(?:static\s+)?([\w\.]+)", raw)
            if m:
                mod = m.group(1)
                result.imports.append(
                    ExtractedImport(
                        module=mod,
                        symbols=[mod.split(".")[-1]],
                        line=node.start_point[0] + 1,
                        raw=raw,
                    )
                )
        elif node.type in ("class_declaration", "interface_declaration"):
            name_node = node.child_by_field_name("name")
            cls_name = _node_text(name_node, source_bytes)
            doc = _get_preceding_comment(node, source_bytes)
            cls_text = _node_text(node, source_bytes)
            is_mod = _is_model_class(file_path, cls_name, [], cls_text)
            result.classes.append(
                ExtractedClass(
                    name=cls_name,
                    line_start=node.start_point[0] + 1,
                    line_end=node.end_point[0] + 1,
                    bases=[],
                    docstring=doc,
                    signature=_first_line_signature(node, source_bytes),
                    code=cls_text,
                    is_model=is_mod,
                )
            )
            for child in node.children:
                walk(child, current_class=cls_name, current_func=current_func)
            return
        elif node.type == "method_declaration":
            name_node = node.child_by_field_name("name")
            params_node = node.child_by_field_name("parameters")
            fn_name = _node_text(name_node, source_bytes)
            qual_name = f"{current_class}.{fn_name}" if current_class else fn_name
            doc = _get_preceding_comment(node, source_bytes)
            method_text = _node_text(node, source_bytes)

            m_spring = re.search(
                r"@(Get|Post|Put|Delete|Patch|Request)Mapping\(\s*(?:value\s*=\s*)?['\"]([^'\"]+)['\"]",
                method_text,
            )
            if m_spring:
                verb = m_spring.group(1).upper()
                if verb == "REQUEST":
                    verb = "GET"
                rpath = m_spring.group(2)
                result.api_endpoints.append(
                    ExtractedAPIEndpoint(
                        http_method=verb,
                        route_path=rpath,
                        name=f"{verb} {rpath}",
                        handlers=[qual_name],
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1,
                        code=_first_line_signature(node, source_bytes),
                    )
                )

            result.functions.append(
                ExtractedFunction(
                    name=fn_name,
                    qualified_name=qual_name,
                    line_start=node.start_point[0] + 1,
                    line_end=node.end_point[0] + 1,
                    parameters=_extract_params(params_node, source_bytes),
                    parent_class=current_class,
                    docstring=doc,
                    signature=_first_line_signature(node, source_bytes),
                    code=method_text,
                    is_method=True,
                )
            )
            for child in node.children:
                walk(child, current_class=current_class, current_func=qual_name)
            return
        elif node.type == "method_invocation":
            name_node = node.child_by_field_name("name")
            obj_node = node.child_by_field_name("object")
            m_name = _node_text(name_node, source_bytes)
            o_name = _node_text(obj_node, source_bytes) if obj_node else None
            callee = f"{o_name}.{m_name}" if o_name else m_name
            if m_name:
                result.calls.append(
                    ExtractedCall(
                        caller=current_func or "<module>",
                        callee=callee,
                        object_name=o_name,
                        method_name=m_name,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            walk(child, current_class=current_class, current_func=current_func)

    walk(root)

