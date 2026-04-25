import importlib.util
import warnings
from pathlib import Path
from scripts.lib.template_render import render_string


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_smb(tmp_path: Path):
    base_text = render_string(
        (PROJECT_ROOT / "templates/src/storage/base.py.tmpl").read_text(encoding="utf-8"), {}
    )
    smb_text = render_string(
        (PROJECT_ROOT / "templates/src/storage/smb.py.tmpl").read_text(encoding="utf-8"), {}
    )
    smb_text = smb_text.replace("from .base import", "from base import")
    base_path = tmp_path / "base.py"; base_path.write_text(base_text, encoding="utf-8")
    smb_path = tmp_path / "smb.py"; smb_path.write_text(smb_text, encoding="utf-8")

    import sys
    sys.path.insert(0, str(tmp_path))
    try:
        spec_b = importlib.util.spec_from_file_location("base", base_path)
        base_mod = importlib.util.module_from_spec(spec_b); spec_b.loader.exec_module(base_mod)
        spec_s = importlib.util.spec_from_file_location("smb", smb_path)
        smb_mod = importlib.util.module_from_spec(spec_s); spec_s.loader.exec_module(smb_mod)
    finally:
        sys.path.remove(str(tmp_path))
    return smb_mod


def test_smb_storage_read_write(tmp_path: Path):
    smb = _load_smb(tmp_path)
    storage = smb.SMBStorage(unc=str(tmp_path / "share"))
    storage.write_text(Path("foo.md"), "hello")
    assert storage.read_text(Path("foo.md")) == "hello"
    assert storage.exists(Path("foo.md"))
    assert not storage.exists(Path("bar.md"))


def test_smb_storage_warns_on_non_unc_path_but_works(tmp_path: Path):
    """When unc starts with drive letter (dogfood/test), warn but still operate."""
    smb = _load_smb(tmp_path)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        smb.SMBStorage(unc=str(tmp_path / "share"))
    assert any("unc" in str(w.message).lower() or "local" in str(w.message).lower() for w in caught)


def test_smb_storage_list_dir(tmp_path: Path):
    smb = _load_smb(tmp_path)
    storage = smb.SMBStorage(unc=str(tmp_path / "share"))
    storage.write_text(Path("d/a.md"), "A")
    storage.write_text(Path("d/b.md"), "B")
    files = sorted(str(p) for p in storage.list_dir(Path("d")))
    assert files == ["a.md", "b.md"]


def test_smb_storage_mtime_returns_float(tmp_path: Path):
    smb = _load_smb(tmp_path)
    storage = smb.SMBStorage(unc=str(tmp_path / "share"))
    storage.write_text(Path("foo.md"), "x")
    mt = storage.mtime(Path("foo.md"))
    assert isinstance(mt, float)
    assert mt > 0
