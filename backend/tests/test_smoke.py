def test_smoke_imports():
    import fastapi
    import networkx
    import pydantic
    import qdrant_client
    import sqlalchemy
    import tree_sitter

    assert fastapi is not None
    assert networkx is not None
    assert pydantic is not None
    assert qdrant_client is not None
    assert sqlalchemy is not None
    assert tree_sitter is not None
