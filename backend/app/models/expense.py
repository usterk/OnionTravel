from sqlalchemy import Column, Integer, String, Text, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Amount in original currency
    amount = Column(Numeric(12, 2), nullable=False)
    currency_code = Column(String(3), nullable=False)

    # Exchange rate and converted amount
    exchange_rate = Column(Numeric(10, 6), nullable=True)
    amount_in_trip_currency = Column(Numeric(12, 2), nullable=True)

    # Date range support (for multi-day expenses)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True, index=True)  # NULL for single-day expense

    # Additional fields
    payment_method = Column(String(50), nullable=True)  # cash, card, transfer
    location = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    trip = relationship("Trip", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
    user = relationship("User", back_populates="expenses")
    attachments = relationship("Attachment", back_populates="expense", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Expense(id={self.id}, title='{self.title}', amount={self.amount} {self.currency_code})>"
