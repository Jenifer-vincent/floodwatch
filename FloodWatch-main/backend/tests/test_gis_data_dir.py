"""GIS folder resolution: GIS_DATA_DIR, then bundled backend/gis_data, then the repo outputs."""

from pathlib import Path

from app.services.gis_service import resolve_gis_output_dir


def test_explicit_setting_wins(tmp_path: Path) -> None:
    bundled = tmp_path / "bundled"
    bundled.mkdir()
    assert resolve_gis_output_dir(str(tmp_path), bundled, tmp_path / "repo") == tmp_path


def test_bundled_copy_used_when_no_setting(tmp_path: Path) -> None:
    bundled = tmp_path / "gis_data"
    bundled.mkdir()
    assert resolve_gis_output_dir("", bundled, tmp_path / "repo") == bundled


def test_repo_outputs_used_when_no_bundled_copy(tmp_path: Path) -> None:
    repo = tmp_path / "r-backend" / "outputs"
    assert resolve_gis_output_dir("  ", tmp_path / "missing", repo) == repo


def test_setting_is_trimmed(tmp_path: Path) -> None:
    bundled = tmp_path / "bundled"
    bundled.mkdir()
    assert resolve_gis_output_dir(f"  {tmp_path}  ", bundled, tmp_path / "repo") == tmp_path
