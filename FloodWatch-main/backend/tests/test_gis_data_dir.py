"""GIS folder resolution: GIS_DATA_DIR wins when set, otherwise the default folder is used."""

from pathlib import Path

from app.services.gis_service import resolve_gis_output_dir


def test_explicit_setting_wins(tmp_path: Path) -> None:
    assert resolve_gis_output_dir(str(tmp_path), tmp_path / "default") == tmp_path


def test_blank_setting_uses_default(tmp_path: Path) -> None:
    default = tmp_path / "r-backend" / "outputs"
    assert resolve_gis_output_dir("   ", default) == default


def test_setting_is_trimmed(tmp_path: Path) -> None:
    assert resolve_gis_output_dir(f"  {tmp_path}  ", tmp_path / "default") == tmp_path
