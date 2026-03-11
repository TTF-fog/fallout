# == Schema Information
#
# Table name: you_tube_videos
#
#  id                     :bigint           not null, primary key
#  caption                :boolean
#  channel_title          :string
#  definition             :string
#  description            :text
#  duration_seconds       :integer
#  live_broadcast_content :string
#  published_at           :datetime
#  tags                   :text
#  thumbnail_url          :string
#  title                  :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  category_id            :string
#  channel_id             :string
#  journal_entry_id       :bigint
#  user_id                :bigint
#  video_id               :string           not null
#
# Indexes
#
#  index_you_tube_videos_on_journal_entry_id  (journal_entry_id)
#  index_you_tube_videos_on_user_id           (user_id)
#  index_you_tube_videos_on_video_id          (video_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (journal_entry_id => journal_entries.id)
#  fk_rails_...  (user_id => users.id)
#
class YouTubeVideo < ApplicationRecord
  belongs_to :user, optional: true
  belongs_to :journal_entry, optional: true

  validates :video_id, presence: true

  serialize :tags, coder: JSON

  validate :user_must_match_journal_user

  scope :by_video_id, ->(vid) { where(video_id: vid) }

  def youtube_url
    "https://www.youtube.com/watch?v=#{video_id}"
  end

  def thumbnail_url_for(quality: "default")
    YouTubeService.thumbnail_url_from_id(video_id, quality: quality)
  end

  private

  def user_must_match_journal_user
    errors.add(:journal_entry, "must belong to the same user") if journal_entry && journal_entry.user_id != user_id
  end
end
