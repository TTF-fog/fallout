# == Schema Information
#
# Table name: project_kudos
#
#  id           :bigint           not null, primary key
#  approved_at  :datetime
#  status       :integer          default("pending"), not null
#  text         :text             not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  project_id   :bigint           not null
#  recipient_id :bigint           not null
#  sender_id    :bigint           not null
#
# Indexes
#
#  index_project_kudos_on_project_id    (project_id)
#  index_project_kudos_on_recipient_id  (recipient_id)
#  index_project_kudos_on_sender_id     (sender_id)
#  index_project_kudos_on_status        (status)
#
# Foreign Keys
#
#  fk_rails_...  (project_id => projects.id)
#  fk_rails_...  (recipient_id => users.id)
#  fk_rails_...  (sender_id => users.id)
#
require "test_helper"

class ProjectKudoTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
