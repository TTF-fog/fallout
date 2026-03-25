# == Schema Information
#
# Table name: collaboration_invites
#
#  id           :bigint           not null, primary key
#  discarded_at :datetime
#  status       :integer          default("pending"), not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  invitee_id   :bigint           not null
#  inviter_id   :bigint           not null
#  project_id   :bigint           not null
#
# Indexes
#
#  index_collaboration_invites_on_discarded_at            (discarded_at)
#  index_collaboration_invites_on_invitee_id              (invitee_id)
#  index_collaboration_invites_on_inviter_id              (inviter_id)
#  index_collaboration_invites_on_project_id              (project_id)
#  index_collaboration_invites_on_project_invitee_status  (project_id,invitee_id,status)
#
# Foreign Keys
#
#  fk_rails_...  (invitee_id => users.id)
#  fk_rails_...  (inviter_id => users.id)
#  fk_rails_...  (project_id => projects.id)
#
class CollaborationInvite < ApplicationRecord
  include Discardable

  has_paper_trail

  belongs_to :project
  belongs_to :inviter, class_name: "User"
  belongs_to :invitee, class_name: "User"

  enum :status, { pending: 0, accepted: 1, declined: 2, revoked: 3 }

  validate :invitee_must_be_verified
  validate :invitee_must_not_be_project_owner
  validate :no_duplicate_pending_invite, on: :create
  validate :invitee_must_not_already_be_collaborator, on: :create

  private

  def invitee_must_be_verified
    errors.add(:invitee, "must be a verified user") if invitee&.trial?
  end

  def invitee_must_not_be_project_owner
    return unless project && invitee
    errors.add(:invitee, "is already the project owner") if invitee_id == project.user_id
  end

  def no_duplicate_pending_invite
    return unless project && invitee
    if CollaborationInvite.pending.where(project: project, invitee: invitee).exists?
      errors.add(:invitee, "already has a pending invite for this project")
    end
  end

  def invitee_must_not_already_be_collaborator
    return unless project && invitee
    if project.collaborator?(invitee)
      errors.add(:invitee, "is already a collaborator on this project")
    end
  end
end
