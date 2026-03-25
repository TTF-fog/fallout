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
require "test_helper"

class CollaborationInviteTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
