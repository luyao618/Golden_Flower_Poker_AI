"""游戏状态内存存储 (T4.2)

管理活跃游戏的内存状态，提供快速读写访问。
数据库用于持久化，内存存储用于游戏进行时的快速操作。
"""

from __future__ import annotations

from app.models.game import GameState


class GameStore:
    """游戏状态内存存储

    维护所有活跃游戏的 GameState 对象。
    游戏引擎的所有操作都直接在内存中的 GameState 上执行。
    """

    def __init__(self) -> None:
        self._games: dict[str, GameState] = {}

    def put(self, game: GameState) -> None:
        """存入或更新游戏状态"""
        self._games[game.game_id] = game

    def get(self, game_id: str) -> GameState | None:
        """获取游戏状态，不存在则返回 None"""
        return self._games.get(game_id)

    def remove(self, game_id: str) -> GameState | None:
        """移除并返回游戏状态"""
        return self._games.pop(game_id, None)

    def list_games(self) -> list[str]:
        """返回所有活跃游戏的 ID 列表"""
        return list(self._games.keys())

    def count(self) -> int:
        """返回活跃游戏数量"""
        return len(self._games)

    def clear(self) -> None:
        """清除所有游戏（仅用于测试）"""
        self._games.clear()


# 全局单例
_store: GameStore | None = None


def get_game_store() -> GameStore:
    """获取全局 GameStore 实例（FastAPI 依赖注入用）"""
    global _store
    if _store is None:
        _store = GameStore()
    return _store


def reset_game_store() -> None:
    """重置全局 GameStore（仅用于测试）"""
    global _store
    _store = None
