# frozen_string_literal: true

class ProjectKudoPolicy < ApplicationPolicy
  def create?
    return false unless user.present? && !user.trial?
    return false unless record.project&.discarded_at.nil? && !record.project.is_unlisted?

    record.project.user_id != user.id
  end
end
