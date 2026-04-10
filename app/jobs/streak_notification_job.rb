# Sends streak reminders to users who haven't posted a journal entry today.
# Runs hourly; only notifies users when their local hour matches their preferred reminder hour
# (derived from their journaling habits via User#preferred_reminder_hour).
class StreakNotificationJob < ApplicationJob
  queue_as :background

  def perform
    User.verified.kept.joins(:streak_days).distinct.find_each do |user|
      local_hour = Time.current.in_time_zone(user.timezone).hour
      next unless local_hour == user.preferred_reminder_hour

      StreakService.send_reminder(user)
    rescue StandardError => e
      ErrorReporter.capture_exception(e, contexts: { streak: { user_id: user.id, action: "reminder" } })
    end
  end
end
