import importlib.util
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "make_parity_fixture.py"


def test_the_parity_fixture_is_up_to_date() -> None:
    spec = importlib.util.spec_from_file_location("make_parity_fixture", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    expected: str = module.render(module.build())
    assert module.FIXTURE.read_text(encoding="utf-8") == expected, (
        "The Python rules changed: run `uv run python scripts/make_parity_fixture.py` "
        "and check that the TypeScript tests still pass"
    )
