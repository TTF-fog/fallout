class MailDeliveryService
  def self.ship_status_changed(ship)
    case ship.status
    when "approved"
      MailMessage.create!(
        summary: "Your ship for #{ship.project.name} was approved!",
        content: ship.feedback.present? ? "Feedback: #{ship.feedback}" : nil,
        user: ship.user,
        source: ship,
        action_url: "/projects/#{ship.project_id}"
      )
    when "returned"
      MailMessage.create!(
        summary: "Your ship for #{ship.project.name} was returned",
        content: "Your submission needs changes.#{" Feedback: #{ship.feedback}" if ship.feedback.present?}",
        user: ship.user,
        source: ship,
        action_url: "/projects/#{ship.project_id}"
      )
    when "rejected"
      MailMessage.create!(
        summary: "Your ship for #{ship.project.name} was not accepted",
        content: ship.feedback.present? ? "Feedback: #{ship.feedback}" : nil,
        user: ship.user,
        source: ship
      )
    end
  end

  def self.collaboration_invite_sent(invite)
    MailMessage.create!(
      summary: "#{invite.inviter.display_name} invited you to collaborate on #{invite.project.name}",
      user: invite.invitee,
      source: invite,
      action_url: "/collaboration_invites/#{invite.id}",
      dismissable: false # User must accept or decline — cannot silently dismiss
    )
  end

  def self.streak_milestone(user, streak_length)
    MailMessage.create!(
      summary: ":yay: #{streak_length}-day streak! You're on fire!",
      user: user,
      action_url: "/streak_goal"
    )
  end

  def self.streak_reminder(user, current_streak)
    MailMessage.create!(
      summary: "Don't lose your #{current_streak}-day streak! Post a journal entry today.",
      user: user,
      action_url: "/journal_entries/new",
      expires_at: 1.day.from_now
    )
  end

  def self.streak_freeze_used(user, remaining)
    MailMessage.create!(
      summary: "A streak freeze was used for you. #{remaining} freeze#{remaining == 1 ? '' : 's'} left.",
      user: user,
      action_url: "/streak_goal"
    )
  end

  def self.streak_broken(user, streak_length)
    MailMessage.create!(
      summary: "Your #{streak_length}-day streak ended. Start a new one today!",
      user: user,
      action_url: "/journal_entries/new"
    )
  end

  def self.streak_goal_broken(user, target_days)
    MailMessage.create!(
      summary: "Your #{target_days}-day streak goal ended. Set a new goal to keep going!",
      user: user,
      action_url: "/streak_goal"
    )
  end

  def self.streak_goal_completed(user, target_days)
    MailMessage.create!(
      summary: "You completed your #{target_days}-day streak goal! Set a new goal to keep going!",
      user: user,
      action_url: "/streak_goal"
    )
  end
end
