# frozen_string_literal: true

class JournalEntryPolicy < ApplicationPolicy
  def create?
    user.present? && record.project&.user == user
  end

  def show?
    admin? || owner?
  end

  def update?
    admin? || owner?
  end

  def destroy?
    admin? || owner?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      if user&.admin?
        scope.all
      else
        scope.kept.where(user: user)
      end
    end
  end
end
