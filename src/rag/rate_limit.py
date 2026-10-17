import math
import threading
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

LimitName = Literal["per_minute", "per_day", "global_per_day"]

_MINUTE = 60.0
_DAY = 86400.0
_SWEEP_INTERVAL = 60.0


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int = 0
    limit: LimitName | None = None


_ALLOWED = RateLimitDecision(allowed=True)


class RateLimiter:
    """In-memory, thread-safe rolling-window limiter: per key per minute, per
    key per day, and global per day. A limit of 0 disables it.

    Each window keeps the timestamps of the requests it admitted, so a window
    "rolls" instead of resetting on a fixed boundary. Denied requests record
    nothing, and keys whose history has fully expired are dropped, so memory is
    bounded by the limits themselves. State lives in the process: correct for a
    single-machine deployment, not shared across machines or restarts.
    """

    def __init__(
        self,
        per_minute: int = 5,
        per_day: int = 20,
        global_per_day: int = 300,
        now: Callable[[], float] = time.monotonic,
    ) -> None:
        self._per_minute = per_minute
        self._per_day = per_day
        self._global_per_day = global_per_day
        self._now = now
        self._lock = threading.Lock()
        self._by_key: dict[str, deque[float]] = {}
        self._global: deque[float] = deque()
        self._last_sweep = now()

    @property
    def tracked_keys(self) -> int:
        with self._lock:
            return len(self._by_key)

    @property
    def stored_timestamps(self) -> int:
        with self._lock:
            return len(self._global) + sum(len(history) for history in self._by_key.values())

    def check(self, key: str) -> RateLimitDecision:
        """Admit and record a request for `key`, or deny it without recording."""
        with self._lock:
            now = self._now()
            self._sweep(now)
            history = self._by_key.get(key)
            if history is None:
                history = deque()
            self._prune(history, now - self._key_horizon)
            self._prune(self._global, now - _DAY)

            denial = self._worst_denial(history, now)
            if denial is not None:
                if not history:
                    self._by_key.pop(key, None)
                return denial

            if self._key_horizon:
                history.append(now)
                self._by_key[key] = history
            if self._global_per_day:
                self._global.append(now)
            return _ALLOWED

    @property
    def _key_horizon(self) -> float:
        """How far back the per-key history must reach (0 = no per-key limit)."""
        if self._per_day:
            return _DAY
        if self._per_minute:
            return _MINUTE
        return 0.0

    @staticmethod
    def _prune(timestamps: deque[float], cutoff: float) -> None:
        while timestamps and timestamps[0] <= cutoff:
            timestamps.popleft()

    def _sweep(self, now: float) -> None:
        """Drop keys with no live history; amortised to once per interval."""
        if now - self._last_sweep < _SWEEP_INTERVAL:
            return
        self._last_sweep = now
        horizon = self._key_horizon
        for key in list(self._by_key):
            history = self._by_key[key]
            self._prune(history, now - horizon)
            if not history:
                del self._by_key[key]

    def _worst_denial(self, history: deque[float], now: float) -> RateLimitDecision | None:
        """The tripped limit with the longest wait, since all must clear."""
        candidates = (
            ("per_minute", self._per_minute, _MINUTE, history),
            ("per_day", self._per_day, _DAY, history),
            ("global_per_day", self._global_per_day, _DAY, self._global),
        )
        worst: RateLimitDecision | None = None
        for name, limit, window, timestamps in candidates:
            if not limit:
                continue
            in_window = [t for t in timestamps if t > now - window]
            if len(in_window) < limit:
                continue
            # The request fits once enough of the oldest entries have expired.
            frees_at = in_window[len(in_window) - limit] + window
            retry = max(1, math.ceil(frees_at - now))
            if worst is None or retry > worst.retry_after_seconds:
                worst = RateLimitDecision(False, retry, name)
        return worst
