# Verifies that a reviewer has posted a checkpoint message in the #fallout-checkpoint
# Slack channel mentioning the project owner within the past 24 hours.
# Returns the permalink of the matching message, or nil if none is found.
class SlackCheckpointService
  CHANNEL_ID = "C0ATLF0ALBW"

  REVIEW_LABELS = {
    "time_audit"          => "Time Audit",
    "requirements_check"  => "Requirements Check",
    "design_review"       => "Design Review",
    "build_review"        => "Build Review"
  }.freeze

  # Checks the channel history for a message in the past 24 hours that mentions
  # the given slack_id. Returns the message permalink on success, nil otherwise.
  def self.find_checkpoint_message(slack_id)
    return nil if slack_id.blank?

    client = Slack::Web::Client.new(token: ENV.fetch("SLACK_BOT_TOKEN", nil))
    oldest = 24.hours.ago.to_i.to_s

    response = client.conversations_history(
      channel: CHANNEL_ID,
      oldest: oldest,
      limit: 200
    )

    mention = "<@#{slack_id}>"
    message = response.messages.find { |m| m.text.to_s.include?(mention) }
    return nil unless message

    permalink_response = client.chat_getPermalink(
      channel: CHANNEL_ID,
      message_ts: message.ts
    )
    permalink_response.permalink
  rescue Slack::Web::Api::Errors::SlackError, Faraday::Error
    nil
  end

  # Verifies a provided permalink actually exists in the channel and mentions
  # the expected slack_id. Returns :ok, :not_found, or :wrong_mention.
  def self.verify_permalink(permalink, slack_id)
    return :not_found if permalink.blank? || slack_id.blank?

    ts = extract_ts(permalink)
    return :not_found unless ts

    client = Slack::Web::Client.new(token: ENV.fetch("SLACK_BOT_TOKEN", nil))
    response = client.conversations_history(
      channel: CHANNEL_ID,
      latest: ts,
      oldest: (ts.to_f - 1).to_s,
      inclusive: true,
      limit: 1
    )

    message = response.messages.first
    return :not_found unless message

    message.text.to_s.include?("<@#{slack_id}>") ? :ok : :wrong_mention
  rescue Slack::Web::Api::Errors::SlackError, Faraday::Error
    :not_found
  end

  # Posts a thread reply on the checkpoint message summarising the review outcome.
  # Only two blocks are sent: a task_card block (timeline) and a card block (project info).
  #
  # message_ts      - Slack ts of the checkpoint message to reply to
  # ship            - Ship record (with reviews and their versions preloaded)
  # review_type     - "requirements_check" or "design_review"
  # review_status   - the terminal status just applied (unused directly; read from record)
  # cover_image_url - absolute URL for the project cover image, or nil
  # project_url     - absolute URL to the project page
  # repo_url        - project repo link, or nil
  def self.post_review_thread(message_ts:, ship:, review_type:, review_status:, cover_image_url:, project_url:, repo_url:) # rubocop:disable Metrics/ParameterLists
    return if message_ts.blank?

    client = Slack::Web::Client.new(token: ENV.fetch("SLACK_BOT_TOKEN", nil))
    project = ship.project
    review_label = REVIEW_LABELS.fetch(review_type, review_type)

    output_elements = build_task_card_output_elements(ship, review_type)

    card_actions = build_card_actions(project_url, repo_url)

    card_block = {
      type: "card",
      icon: {
        type: "image",
        image_url: project.user.avatar,
        alt_text: project.user.display_name
      },
      title: { type: "mrkdwn", text: project.name, verbatim: false },
      subtitle: { type: "mrkdwn", text: project.user.display_name, verbatim: false },
      body: { type: "mrkdwn", text: project.description.to_s.truncate(280), verbatim: false },
      actions: card_actions
    }

    if cover_image_url.present?
      card_block[:hero_image] = {
        type: "image",
        image_url: cover_image_url,
        alt_text: "#{project.name} cover image"
      }
    end

    overall_status = output_elements.any? { |el| el[:elements]&.first&.dig(:text)&.start_with?("❌") } ? "error" : "complete"

    task_card_block = {
      type: "task_card",
      task_id: "review_#{ship.id}_#{review_type}",
      title: review_label,
      status: overall_status,
      output: {
        type: "rich_text",
        elements: output_elements
      }
    }

    blocks = [ task_card_block, card_block ]

    client.chat_postMessage(
      channel: CHANNEL_ID,
      thread_ts: message_ts,
      text: "#{project.name} — #{review_label} review submitted",
      blocks: blocks.to_json
    )
  rescue Slack::Web::Api::Errors::SlackError, Faraday::Error
    nil
  end

  # Extracts the Slack message ts from a permalink URL.
  # Slack permalinks encode the timestamp as the last path segment,
  # e.g. https://hackclub.enterprise.slack.com/archives/C.../p1234567890123456
  # The "p"-prefixed number maps to a message ts like "1234567890.123456".
  def self.extract_ts(permalink)
    return nil if permalink.blank?

    match = permalink.match(%r{/p(\d{10})(\d{6})$})
    return nil unless match

    "#{match[1]}.#{match[2]}"
  end

  # Builds an array of rich_text_section elements for the task_card output field.
  # Each stage is its own section with a single text element prefixed with an emoji:
  #   ✅ approved  ❌ returned/rejected  ⏳ pending/not started
  # Past returned/rejected ships are listed first as prior attempts.
  def self.build_task_card_output_elements(ship, review_type)
    sections = []
    project = ship.project

    past_ships = project.ships
      .where(status: [ :returned, :rejected ])
      .where.not(id: ship.id)
      .order(:created_at)
      .includes(:requirements_check_review, :design_review)

    past_ships.each_with_index do |past_ship, idx|
      past_review = case review_type
      when "requirements_check" then past_ship.requirements_check_review
      when "design_review"      then past_ship.design_review
      end
      next if past_review.nil?

      label = "#{REVIEW_LABELS[review_type]} (attempt #{idx + 1})"
      feedback = past_review.feedback.to_s.presence || past_review.status.to_s.capitalize
      sections << text_section("❌ #{label}: #{feedback}")
    end

    attempt_num = past_ships.size + 1
    current_label_suffix = past_ships.any? ? " (attempt #{attempt_num})" : ""

    case review_type
    when "requirements_check"
      sections << stage_section(ship.time_audit_review, "time_audit", "")
      sections << stage_section(ship.requirements_check_review, "requirements_check", current_label_suffix)
      sections << text_section("⏳ #{REVIEW_LABELS["design_review"]}: Not yet started")
    when "design_review"
      sections << stage_section(ship.time_audit_review, "time_audit", "")
      sections << stage_section(ship.requirements_check_review, "requirements_check", "")
      sections << stage_section(ship.design_review, "design_review", current_label_suffix)
    end

    sections.compact
  end
  private_class_method :build_task_card_output_elements

  def self.stage_section(review, key, label_suffix)
    return nil if review.nil?

    emoji = case review.status.to_s
    when "approved" then "✅"
    when "returned", "rejected" then "❌"
    else "⏳"
    end

    detail = review.feedback.to_s.presence || review.status.to_s.capitalize
    label = "#{REVIEW_LABELS[key]}#{label_suffix}"
    text_section("#{emoji} #{label}: #{detail}")
  end
  private_class_method :stage_section

  def self.text_section(text)
    {
      type: "rich_text_section",
      elements: [ { type: "text", text: text } ]
    }
  end
  private_class_method :text_section

  def self.build_card_actions(project_url, repo_url)
    actions = [ {
      type: "button",
      text: { type: "plain_text", text: "View Project", emoji: false },
      action_id: "view_project",
      url: project_url
    } ]

    if repo_url.present?
      actions << {
        type: "button",
        text: { type: "plain_text", text: "GitHub", emoji: false },
        action_id: "view_repo",
        url: repo_url
      }
    end

    actions
  end
  private_class_method :build_card_actions
end
