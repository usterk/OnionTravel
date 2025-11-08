from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TripUser(Base):
    __tablename__ = "trip_users"
    __table_args__ = (
        UniqueConstraint('trip_id', 'user_id', name='unique_trip_user'),
    )

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="member", nullable=False)  # owner, admin, member, viewer
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    trip = relationship("Trip", back_populates="members")
    user = relationship("User", back_populates="trip_memberships")

    def __repr__(self):
        return f"<TripUser(trip_id={self.trip_id}, user_id={self.user_id}, role='{self.role}')>"
