import threading
import time
import unicodedata
from collections import OrderedDict
from collections.abc import Callable

from rag.models import QueryResponse

_LEADING_PUNCTUATION = "¿¡ "
_TRAILING_PUNCTUATION = "?!. "


def normalize_question(question: str) -> str:
    """Cache key for a question: accent-, case-, spacing- and punctuation-insensitive."""
    decomposed = unicodedata.normalize("NFKD", question)
    stripped = "".join(char for char in decomposed if not unicodedata.combining(char))
    collapsed = " ".join(stripped.lower().split())
    return collapsed.lstrip(_LEADING_PUNCTUATION).rstrip(_TRAILING_PUNCTUATION)


class ResponseCache:
    """Thread-safe in-memory LRU of successful responses, with a TTL.

    Matching is exact on the normalized question (no semantic similarity).
    The TTL counts from the write, so a popular answer is still refreshed.
    `max_size=0` disables the cache. State lives in the process: it resets on
    restart and is not shared across machines.
    """

    def __init__(
        self,
        max_size: int = 200,
        ttl_seconds: float = 86400,
        now: Callable[[], float] = time.monotonic,
    ) -> None:
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._now = now
        self._lock = threading.Lock()
        self._entries: OrderedDict[str, tuple[float, QueryResponse]] = OrderedDict()

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)

    def get(self, question: str) -> QueryResponse | None:
        """The cached response flagged `cached=True`, or None on a miss."""
        key = normalize_question(question)
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            stored_at, response = entry
            if self._now() - stored_at >= self._ttl:
                del self._entries[key]
                return None
            self._entries.move_to_end(key)
        return response.model_copy(update={"cached": True})

    def put(self, question: str, response: QueryResponse) -> None:
        if self._max_size <= 0:
            return
        key = normalize_question(question)
        with self._lock:
            self._entries[key] = (self._now(), response)
            self._entries.move_to_end(key)
            while len(self._entries) > self._max_size:
                self._entries.popitem(last=False)
