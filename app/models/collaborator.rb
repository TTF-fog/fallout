# == Schema Information
#
# Table name: collaborators
#
#  id                  :bigint           not null, primary key
#  collaboratable_type :string           not null
#  discarded_at        :datetime
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  collaboratable_id   :bigint           not null
#  user_id             :bigint           not null
#
# Indexes
#
#  index_collaborators_on_collaboratable  (collaboratable_type,collaboratable_id)
#  index_collaborators_on_discarded_at    (discarded_at)
#  index_collaborators_on_user_id         (user_id)
#  index_collaborators_uniqueness         (user_id,collaboratable_type,collaboratable_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class Collaborator < ApplicationRecord
  include Discardable

  has_paper_trail

  belongs_to :user
  belongs_to :collaboratable, polymorphic: true

  validates :user_id, uniqueness: { scope: [ :collaboratable_type, :collaboratable_id ], message: "is already a collaborator" }
  validate :user_must_be_verified
  validate :user_must_not_be_owner

  private

  def user_must_be_verified
    errors.add(:user, "must be a verified user") if user&.trial?
  end

  def user_must_not_be_owner
    return unless collaboratable.respond_to?(:user_id)
    errors.add(:user, "cannot be the owner") if user_id == collaboratable.user_id
  end
end
