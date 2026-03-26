"""Persistent alert storage in SQLite + Discord webhook notifications."""

import logging
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

DB_PATH = Path(os.getenv("ALERT_DB_PATH", "data/alerts.db"))
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

_db: Optional[sqlite3.Connection] = None


def _get_db() -> sqlite3.Connection:
    global _db
    if _db is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _db = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _db.execute("PRAGMA journal_mode=WAL")
        _db.execute("""
            CREATE TABLE IF NOT EXISTS alert_configs (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                condition TEXT NOT NULL,
                threshold REAL NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                discord_webhook TEXT,
                created_at TEXT NOT NULL
            )
        """)
        _db.execute("""
            CREATE TABLE IF NOT EXISTS triggered_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                condition TEXT NOT NULL,
                threshold REAL NOT NULL,
                actual_score REAL NOT NULL,
                direction TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        _db.commit()
        # Seed default alerts if empty
        count = _db.execute("SELECT COUNT(*) FROM alert_configs").fetchone()[0]
        if count == 0:
            _seed_defaults()
    return _db


def _seed_defaults() -> None:
    db = _get_db()
    defaults = [
        ("btc-high", "BTC-USDC", "above", 70),
        ("btc-low", "BTC-USDC", "below", 30),
        ("eth-high", "ETH-USDC", "above", 70),
        ("sol-high", "SOL-USDC", "above", 65),
    ]
    now = datetime.now(tz=timezone.utc).isoformat()
    for aid, sym, cond, thresh in defaults:
        db.execute(
            "INSERT OR IGNORE INTO alert_configs (id, symbol, condition, threshold, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)",
            (aid, sym, cond, thresh, now),
        )
    db.commit()


def get_configs() -> list[dict]:
    db = _get_db()
    rows = db.execute("SELECT id, symbol, condition, threshold, enabled, discord_webhook FROM alert_configs").fetchall()
    return [
        {
            "id": r[0],
            "symbol": r[1],
            "condition": r[2],
            "threshold": r[3],
            "enabled": bool(r[4]),
            "discord_webhook": r[5],
        }
        for r in rows
    ]


def create_config(symbol: str, condition: str, threshold: float, discord_webhook: str = "") -> dict:
    db = _get_db()
    alert_id = f"{symbol.lower()}-{condition}-{int(threshold)}-{int(time.time())}"
    now = datetime.now(tz=timezone.utc).isoformat()
    db.execute(
        "INSERT INTO alert_configs (id, symbol, condition, threshold, enabled, discord_webhook, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
        (alert_id, symbol, condition, threshold, discord_webhook, now),
    )
    db.commit()
    return {
        "id": alert_id,
        "symbol": symbol,
        "condition": condition,
        "threshold": threshold,
        "enabled": True,
        "discord_webhook": discord_webhook,
    }


def delete_config(alert_id: str) -> None:
    db = _get_db()
    db.execute("DELETE FROM alert_configs WHERE id=?", (alert_id,))
    db.commit()


def get_triggered(limit: int = 100) -> list[dict]:
    db = _get_db()
    rows = db.execute(
        "SELECT config_id, symbol, condition, threshold, actual_score, direction, timestamp FROM triggered_alerts ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [
        {
            "id": r[0],
            "symbol": r[1],
            "condition": r[2],
            "threshold": r[3],
            "actual_score": r[4],
            "direction": r[5],
            "timestamp": r[6],
        }
        for r in rows
    ]


def check_and_trigger(symbol: str, alpha_score: float, direction: str) -> list[dict]:
    """Check all configs for a symbol and trigger matching alerts."""
    db = _get_db()
    configs = db.execute(
        "SELECT id, condition, threshold, discord_webhook FROM alert_configs WHERE symbol=? AND enabled=1",
        (symbol,),
    ).fetchall()

    triggered = []
    now = datetime.now(tz=timezone.utc).isoformat()
    for config_id, condition, threshold, webhook in configs:
        fire = False
        if condition == "above" and alpha_score >= threshold:
            fire = True
        elif condition == "below" and alpha_score <= threshold:
            fire = True

        if not fire:
            continue

        # Avoid duplicate: check if same config fired in last 5 minutes
        recent = db.execute(
            "SELECT COUNT(*) FROM triggered_alerts WHERE config_id=? AND timestamp > datetime('now', '-5 minutes')",
            (config_id,),
        ).fetchone()[0]
        if recent > 0:
            continue

        db.execute(
            "INSERT INTO triggered_alerts (config_id, symbol, condition, threshold, actual_score, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (config_id, symbol, condition, threshold, alpha_score, direction, now),
        )
        alert = {
            "id": config_id,
            "symbol": symbol,
            "condition": condition,
            "threshold": threshold,
            "actual_score": alpha_score,
            "direction": direction,
            "timestamp": now,
        }
        triggered.append(alert)

        # Send Discord webhook
        wh = webhook or DISCORD_WEBHOOK_URL
        if wh:
            _send_discord(wh, alert)

    db.commit()
    return triggered


def _send_discord(webhook_url: str, alert: dict) -> None:
    """Send alert to Discord webhook (fire-and-forget)."""
    try:
        emoji = "🟢" if alert["direction"] == "bullish" else "🔴" if alert["direction"] == "bearish" else "🟡"
        msg = {
            "embeds": [
                {
                    "title": f"{emoji} Alpha Alert: {alert['symbol']}",
                    "description": f"Alpha Score **{alert['actual_score']:.0f}** is {alert['condition']} {alert['threshold']:.0f}\nDirection: **{alert['direction'].upper()}**",
                    "color": 0x22C55E
                    if alert["direction"] == "bullish"
                    else 0xEF4444
                    if alert["direction"] == "bearish"
                    else 0xEAB308,
                    "timestamp": alert["timestamp"],
                    "footer": {"text": "Alpha Compass — Pacifica DEX Analytics"},
                }
            ]
        }
        httpx.post(webhook_url, json=msg, timeout=5)
    except Exception as e:
        logger.warning(f"Discord webhook failed: {e}")
