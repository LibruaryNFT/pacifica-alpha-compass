"""Pydantic models for Pacifica Alpha Compass."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class MarketDirection(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class MarketRegime(str, Enum):
    TRENDING = "trending"
    RANGING = "ranging"
    VOLATILE = "volatile"


class MarketPrice(BaseModel):
    """Real-time market price data."""

    symbol: str = Field(..., description="Trading pair symbol e.g. SOL-USDC")
    price: float = Field(..., gt=0)
    change_24h: float = Field(default=0.0)
    volume_24h: float = Field(default=0.0)
    high_24h: float = Field(default=0.0)
    low_24h: float = Field(default=0.0)
    funding_rate: Optional[float] = None
    open_interest: Optional[float] = None


class FundingRate(BaseModel):
    """Funding rate for a perpetual market."""

    symbol: str
    rate: float
    next_funding_time: Optional[str] = None
    annualized: Optional[float] = None


class Position(BaseModel):
    """User trading position."""

    symbol: str
    side: str  # "long" or "short"
    size: float
    entry_price: float
    mark_price: float
    unrealized_pnl: float
    realized_pnl: float = 0.0
    leverage: float = 1.0
    liquidation_price: Optional[float] = None
    margin: Optional[float] = None


class PortfolioSummary(BaseModel):
    """Portfolio-level metrics."""

    total_equity: float
    total_unrealized_pnl: float
    total_realized_pnl: float
    total_margin_used: float
    available_balance: float
    positions: list[Position] = Field(default_factory=list)
    portfolio_heat: float = Field(default=0.0, description="0-100 score of portfolio risk")


class AIAnalysis(BaseModel):
    """Single AI model's analysis."""

    model_name: str = Field(..., description="claude, gpt4o, or llama")
    role: str = Field(..., description="risk, sentiment, or technical")
    direction: MarketDirection
    confidence: float = Field(..., ge=0.0, le=1.0)
    score: float = Field(..., ge=0.0, le=10.0)
    reasoning: str
    key_factors: list[str] = Field(default_factory=list)


class ConsensusResult(BaseModel):
    """Multi-model AI consensus."""

    symbol: str
    direction: MarketDirection
    confidence: float = Field(..., ge=0.0, le=1.0)
    overall_score: float = Field(..., ge=0.0, le=10.0)
    regime: MarketRegime
    summary: str = Field(..., description="Natural language market summary")
    analyses: list[AIAnalysis] = Field(default_factory=list)
    alert: Optional[str] = Field(None, description="Urgent alert if conditions are unusual")
    timestamp: str = ""


class FundingScanResult(BaseModel):
    """Cross-market funding rate scan."""

    opportunities: list[dict] = Field(default_factory=list)
    highest_positive: Optional[FundingRate] = None
    most_negative: Optional[FundingRate] = None
    average_rate: float = 0.0


class WhaleAlert(BaseModel):
    """Detected large trade or position change."""

    symbol: str
    side: str
    size_usd: float
    price: float
    timestamp: str
    alert_type: str = "large_trade"  # large_trade, liquidation, orderbook_imbalance
