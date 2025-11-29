from sqlalchemy import Column, Integer, String, Text, Date, Numeric, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    currency_code = Column(String(3), nullable=False)  # ISO 4217 (USD, EUR, PLN, THB, etc.)
    total_budget = Column(Numeric(12, 2), nullable=True)
    daily_budget = Column(Numeric(12, 2), nullable=True)
    sort_categories_by_usage = Column(Boolean, default=True, nullable=False, doc="Whether to sort categories by usage count (True) or by display_order (False)")
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_trips", foreign_keys=[owner_id])
    members = relationship("TripUser", back_populates="trip", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="trip", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Trip(id={self.id}, name='{self.name}', currency='{self.currency_code}')>"
