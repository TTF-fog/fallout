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
require "test_helper"

class CollaboratorTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
