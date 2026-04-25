"""Test the storage/local.py template by rendering + executing it."""
import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_string


def _load_modules(tmp_path: Path):
    base_text = render_string(
        Path("templates/src/storage/base.py.tmpl").read_text(encoding="utf-8"), {}
    )
    local_text = render_string(
        Path("templates/src/storage/local.py.tmpl").read_text(encoding="utf-8"), {}
    )
    # Replace package-relative imports for ad-hoc loading in tests
    local_text = local_text.replace("from .base import", "from base import")

    base_path = tmp_path / "base.py"
    local_path = tmp_path / "local.py"
    base_path.write_text(base_text, encoding="utf-8")
    local_path.write_text(local_text, encoding="utf-8")

    import sys
    sys.path.insert(0, str(tmp_path))
    try:
        spec_b = importlib.util.spec_from_file_location("base", base_path)
        base_mod = importlib.util.module_from_spec(spec_b)
        spec_b.loader.exec_module(base_mod)
        spec_l = importlib.util.spec_from_file_location("local", local_path)
        local_mod = importlib.util.module_from_spec(spec_l)
        spec_l.loader.exec_module(local_mod)
    finally:
        sys.path.remove(str(tmp_path))
    return base_mod, local_mod


def test_local_storage_read_write(tmp_path: Path):
    _, local_mod = _load_modules(tmp_path)
    storage = local_mod.LocalStorage(root=tmp_path / "store")
    storage.write_text(Path("foo.md"), "hello")
    assert storage.read_text(Path("foo.md")) == "hello"
    assert storage.exists(Path("foo.md"))
    assert not storage.exists(Path("bar.md"))


def test_local_storage_list_dir(tmp_path: Path):
    _, local_mod = _load_modules(tmp_path)
    storage = local_mod.LocalStorage(root=tmp_path / "store")
    storage.write_text(Path("subdir/a.md"), "A")
    storage.write_text(Path("subdir/b.md"), "B")
    files = sorted([str(f) for f in storage.list_dir(Path("subdir"))])
    assert files == ["a.md", "b.md"]


def test_local_storage_mtime_returns_float(tmp_path: Path):
    _, local_mod = _load_modules(tmp_path)
    storage = local_mod.LocalStorage(root=tmp_path / "store")
    storage.write_text(Path("foo.md"), "hello")
    mt = storage.mtime(Path("foo.md"))
    assert isinstance(mt, float)
    assert mt > 0
