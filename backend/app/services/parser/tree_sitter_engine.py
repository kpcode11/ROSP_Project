import tree_sitter
import tree_sitter_java as tsjava
import tree_sitter_javascript as tsjavascript
import tree_sitter_python as tspython
import tree_sitter_typescript as tstypescript


class TreeSitterEngine:
    """Singleton-style manager for Tree-sitter language grammars and parsers."""

    def __init__(self) -> None:
        self._languages: dict[str, tree_sitter.Language] = {
            "python": tree_sitter.Language(tspython.language()),
            "javascript": tree_sitter.Language(tsjavascript.language()),
            "typescript": tree_sitter.Language(tstypescript.language_typescript()),
            "tsx": tree_sitter.Language(tstypescript.language_tsx()),
            "java": tree_sitter.Language(tsjava.language()),
        }

    def get_language(self, language: str, file_path: str = "") -> tree_sitter.Language:
        if language == "typescript" and file_path.lower().endswith(".tsx"):
            return self._languages["tsx"]
        if language not in self._languages:
            raise ValueError(f"Unsupported language for Tree-sitter: {language}")
        return self._languages[language]

    def parse(self, source_bytes: bytes, language: str, file_path: str = "") -> tree_sitter.Tree:
        ts_lang = self.get_language(language, file_path)
        parser = tree_sitter.Parser(ts_lang)
        return parser.parse(source_bytes)


engine = TreeSitterEngine()

