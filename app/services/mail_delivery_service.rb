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
end
