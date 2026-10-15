# Types for the part of pyplAI 1.1.0 this project uses: the library ships without type hints.
# Signatures follow pyplAI/Algoritmos.py at tag v1.1.0.
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Literal

@dataclass
class EvaluacionMovimiento:
    movimiento: Any
    visitas: int
    valor: float

@dataclass
class ResultadoAnalisis:
    movimiento: Any
    movimientos: list[EvaluacionMovimiento]
    iteraciones: int
    nodos: int
    tiempo: float

class MCTS:
    def __init__(
        self,
        aplicar_movimiento: Callable[[Any, Any], Any],
        obtener_movimientos: Callable[[Any], list[Any]],
        es_estado_final: Callable[[Any], bool],
        gana_jugador: Callable[[Any, int], bool],
        numeroJugadores: int,
        tiempoEjecucion: float,
        estadisticas: bool = False,
        *,
        iteraciones: int | None = None,
        semilla: int | None = None,
        seleccion_final: Literal["media", "visitas"] = "media",
    ) -> None: ...
    def analiza(self, s0: Any) -> ResultadoAnalisis: ...
    def ejecuta(self, s0: Any) -> Any: ...

__version__: str
