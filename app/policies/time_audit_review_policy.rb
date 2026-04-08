# frozen_string_literal: true

class TimeAuditReviewPolicy < ApplicationPolicy
  def index?
    admin? || staff_reviewer?
  end

  def show?
    return true if admin?
    return false if record.ship.project.flagged? # Only admins can view flagged reviews
    staff_reviewer?
  end

  def update?
    record.pending? && (admin? || active_claimer?) # Only pending reviews can be modified
  end

  # Heartbeat extends the claim — only the active claimer (or admin) can call it
  def heartbeat?
    admin? || active_claimer?
  end

  private

  # Requires an active (non-expired) claim, not just reviewer_id match
  def active_claimer?
    record.claimed_by?(user)
  end

  def staff_reviewer?
    user&.can_review?(:time_audit) # Only time auditors (and admins) can access this queue
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      if user&.can_review?(:time_audit)
        scope.all
      else
        scope.none
      end
    end
  end
end
