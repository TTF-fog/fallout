# == Schema Information
#
# Table name: journal_entries
#
#  id           :bigint           not null, primary key
#  content      :text
#  discarded_at :datetime
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  project_id   :bigint           not null
#  user_id      :bigint           not null
#
# Indexes
#
#  index_journal_entries_on_discarded_at  (discarded_at)
#  index_journal_entries_on_project_id    (project_id)
#  index_journal_entries_on_user_id       (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (project_id => projects.id)
#  fk_rails_...  (user_id => users.id)
#
class JournalEntry < ApplicationRecord
  include Discardable

  has_paper_trail

  belongs_to :user
  belongs_to :project
  has_many :lapse_timelapses, dependent: :nullify
  has_many :you_tube_videos, dependent: :nullify
  has_many_attached :images

  validate :user_must_own_project
  validate :validate_image_content_types
  validate :validate_image_sizes
  validate :validate_image_count

  private

  def user_must_own_project
    errors.add(:user, "must own the project") if project && user && project.user_id != user_id
  end

  def validate_image_content_types
    images.each do |image|
      unless image.content_type.in?(%w[image/png image/jpeg image/gif image/webp])
        errors.add(:images, "must be PNG, JPEG, GIF, or WebP")
        break
      end
    end
  end

  def validate_image_sizes
    images.each do |image|
      if image.byte_size > 10.megabytes
        errors.add(:images, "must be less than 10 MB each")
        break
      end
    end
  end

  def validate_image_count
    errors.add(:images, "cannot exceed 20") if images.size > 20
  end
end
