from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    __table_args__ = (
        UniqueConstraint('from_currency', 'to_currency', 'date', name='unique_exchange_rate'),
    )

    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(String(3), nullable=False, index=True)  # ISO 4217 code
    to_currency = Column(String(3), nullable=False, index=True)  # ISO 4217 code
    rate = Column(Numeric(10, 6), nullable=False)
    date = Column(Date, nullable=False, index=True)  # Date when this rate is valid
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<ExchangeRate({self.from_currency}/{self.to_currency}={self.rate} on {self.date})>"
