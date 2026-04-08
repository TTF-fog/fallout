class TimelapseActivityCheckJob < ApplicationJob
  queue_as :heavy

  # Accepts any recordable: LookoutTimelapse, LapseTimelapse, or YouTubeVideo
  def perform(recordable)
    result = TimelapseActivityChecker.new(recordable).run

    recordable.update!(
      inactive_frame_count: result[:inactive_frames],
      inactive_percentage: result[:inactive_percentage],
      inactive_segments: result[:segments],
      activity_checked_at: Time.current
    )
  end
end
