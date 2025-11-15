from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    color = Column(String(7), nullable=False)  # Hex color (#FF5733)
    icon = Column(String(50), nullable=True)  # Icon name (lucide-react)
    budget_percentage = Column(Numeric(5, 2), nullable=True)  # 0-100%
    is_default = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, nullable=False, default=0)  # Order for display/sorting
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    trip = relationship("Trip", back_populates="categories")
    expenses = relationship("Expense", back_populates="category")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', trip_id={self.trip_id})>"
