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
require "test_helper"

class YouTubeVideoTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
