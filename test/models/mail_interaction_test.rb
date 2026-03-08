# == Schema Information
#
# Table name: mail_interactions
#
#  id              :bigint           not null, primary key
#  dismissed_at    :datetime
#  read_at         :datetime
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  mail_message_id :bigint           not null
#  user_id         :bigint           not null
#
# Indexes
#
#  index_mail_interactions_on_mail_message_id              (mail_message_id)
#  index_mail_interactions_on_user_id                      (user_id)
#  index_mail_interactions_on_user_id_and_mail_message_id  (user_id,mail_message_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (mail_message_id => mail_messages.id)
#  fk_rails_...  (user_id => users.id)
#
require "test_helper"

class MailInteractionTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
