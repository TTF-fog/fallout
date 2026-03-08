# frozen_string_literal: true

class MailMessagePolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    visible_to_user?
  end

  def dismiss?
    visible_to_user? && record.dismissable?
  end

  def create?
    admin?
  end

  def update?
    admin?
  end

  def destroy?
    admin?
  end

  private

  def visible_to_user?
    MailMessage.visible_to(user).exists?(id: record.id)
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.visible_to(user)
    end
  end
end
