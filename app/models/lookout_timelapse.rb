# == Schema Information
#
# Table name: lookout_timelapses
#
#  id                :bigint           not null, primary key
#  duration          :float
#  last_refreshed_at :datetime
#  name              :string
#  playback_url      :string
#  session_token     :text             not null
#  thumbnail_url     :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  user_id           :bigint           not null
#
# Indexes
#
#  index_lookout_timelapses_on_session_token  (session_token) UNIQUE
#  index_lookout_timelapses_on_user_id        (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class LookoutTimelapse < ApplicationRecord
  belongs_to :user
  has_one :recording, as: :recordable, dependent: :destroy

  validates :session_token, presence: true, uniqueness: true

  def fetch_data
    LookoutService.get_session(session_token)
  end

  def refetch_data!
    data = fetch_data
    raise ActiveRecord::RecordNotFound, "Lookout session for token not found" unless data

    update!(
      name: data["name"].presence || name,
      duration: data["trackedSeconds"],
      playback_url: data["videoUrl"],
      thumbnail_url: data["thumbnailUrl"],
      last_refreshed_at: Time.current
    )
  end
end
