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
class MailInteraction < ApplicationRecord
  belongs_to :mail_message
  belongs_to :user

  validates :mail_message_id, uniqueness: { scope: :user_id }

  scope :read, -> { where.not(read_at: nil) }
  scope :dismissed, -> { where.not(dismissed_at: nil) }
end
