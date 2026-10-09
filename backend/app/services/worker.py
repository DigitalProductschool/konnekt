"""Background worker (research R7).

A daemon thread runs the registered steps every two seconds. Each step is a plain
function that opens its own database sessions and keeps its transactions short, so
tests call the steps directly. Outbound calls go to a small thread pool through
`dispatch()`, and the loop never waits for them.
"""

import logging
import threading
import time
import traceback
from collections.abc import Callable, Sequence
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete

from ..db import SessionLocal
from ..models import LoginSession

logger = logging.getLogger(__name__)

CYCLE_SECONDS = 2.0
POOL_SIZE = 8
STOP_TIMEOUT_SECONDS = 10.0

Step = Callable[[], None]

_pool: ThreadPoolExecutor | None = None
_in_flight: set[str] = set()
_in_flight_lock = threading.Lock()


def describe_error(error: BaseException) -> str:
    """Name an error and the code that raised it, leaving out its message.

    Messages can quote data (a failed validation quotes its input), so logging them
    could put personal data into the log.
    """
    frames = traceback.extract_tb(error.__traceback__)
    if not frames:
        return type(error).__name__
    own_frames = [frame for frame in frames if 'site-packages' not in frame.filename]
    frame = (own_frames or frames)[-1]
    return (
        f'{type(error).__name__} in {frame.name} '
        f'({Path(frame.filename).name}:{frame.lineno})'
    )


def dispatch(key: str, call: Callable[[], None]) -> bool:
    """Run an outbound call in the pool, unless a call with this key is running.

    Keys name the work and an internal id, never a request reference. Without a
    running worker (in tests) the call runs at once, in the calling thread. Returns
    False when the same key was still in flight.
    """
    with _in_flight_lock:
        if key in _in_flight:
            return False
        _in_flight.add(key)
    pool = _pool
    if pool is None:
        _run_call(key, call)
    else:
        pool.submit(_run_call, key, call)
    return True


def _run_call(key: str, call: Callable[[], None]) -> None:
    try:
        call()
    except Exception as error:
        logger.error('Worker call %s failed: %s', key, describe_error(error))
    finally:
        with _in_flight_lock:
            _in_flight.discard(key)


def delete_expired_login_sessions() -> None:
    """Delete sign-in sessions whose time is up (research R7, step 8)."""
    with SessionLocal() as db:
        db.execute(
            delete(LoginSession).where(
                LoginSession.expires_at <= datetime.now(tz=timezone.utc)
            )
        )
        db.commit()


# The steps of one cycle, in the order of research R7
STEPS: tuple[Step, ...] = (delete_expired_login_sessions,)


def run_steps(steps: Sequence[Step] = STEPS) -> None:
    """Run each step once. A failing step is logged and the next one still runs."""
    for step in steps:
        try:
            step()
        except Exception as error:
            logger.error(
                'Worker step %s failed: %s', step.__name__, describe_error(error)
            )


class Worker:
    """Runs the steps every CYCLE_SECONDS on a daemon thread."""

    def __init__(self, steps: Sequence[Step] = STEPS) -> None:
        self._steps = tuple(steps)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """Start the thread and the pool for outbound calls."""
        global _pool
        _pool = ThreadPoolExecutor(
            max_workers=POOL_SIZE, thread_name_prefix='worker-call'
        )
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name='worker', daemon=True)
        self._thread.start()
        logger.info('Worker started')

    def stop(self) -> None:
        """Finish the current cycle, then stop; queued calls are dropped."""
        global _pool
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=STOP_TIMEOUT_SECONDS)
        if _pool is not None:
            _pool.shutdown(wait=False, cancel_futures=True)
            _pool = None
        logger.info('Worker stopped')

    def _run(self) -> None:
        while not self._stop.is_set():
            started = time.monotonic()
            run_steps(self._steps)
            elapsed = time.monotonic() - started
            self._stop.wait(max(0.0, CYCLE_SECONDS - elapsed))
