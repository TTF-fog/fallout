# == Schema Information
#
# Table name: project_flags
#
#  id           :bigint           not null, primary key
#  reason       :text             not null
#  review_stage :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  project_id   :bigint           not null
#  ship_id      :bigint
#  user_id      :bigint           not null
#
# Indexes
#
#  index_project_flags_on_project_id  (project_id)
#  index_project_flags_on_ship_id     (ship_id)
#  index_project_flags_on_user_id     (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (project_id => projects.id)
#  fk_rails_...  (ship_id => ships.id)
#  fk_rails_...  (user_id => users.id)
#
require "test_helper"

class ProjectFlagTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
