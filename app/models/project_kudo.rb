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
class ProjectKudo < ApplicationRecord
  enum :status, { pending: 0, approved: 1 }

  belongs_to :project
  belongs_to :sender, class_name: "User"
  belongs_to :recipient, class_name: "User"

  validates :text, presence: true, length: { maximum: 500 }
  validate :sender_cannot_be_recipient

  def approve!
    update!(status: :approved, approved_at: Time.current)
  end

  private

  def sender_cannot_be_recipient
    errors.add(:recipient, "can't be the sender") if sender_id.present? && sender_id == recipient_id
  end
end
