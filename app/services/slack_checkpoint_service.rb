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
  # the expected slack_id. Returns true/false.
  def self.verify_permalink(permalink, slack_id)
    return false if permalink.blank? || slack_id.blank?

    ts = extract_ts(permalink)
    return false unless ts

    client = Slack::Web::Client.new(token: ENV.fetch("SLACK_BOT_TOKEN", nil))
    response = client.conversations_history(
      channel: CHANNEL_ID,
      latest: ts,
      oldest: (ts.to_f - 1).to_s,
      inclusive: true,
      limit: 1
    )

    message = response.messages.first
    return false unless message

    message.text.to_s.include?("<@#{slack_id}>")
  rescue Slack::Web::Api::Errors::SlackError, Faraday::Error
    false
  end

  # Posts a thread reply on the checkpoint message summarising the review outcome.
  # Only two blocks are sent: a plan block (timeline) and a card block (project info).
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

    tasks = build_plan_tasks(ship, review_type)

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

    plan_status = tasks.any? { |t| t[:status] == "error" } ? "error" : "complete"

    blocks = [
      {
        type: "plan",
        plan_id: "plan_#{ship.id}_#{review_type}",
        title: review_label,
        status: plan_status,
        tasks: tasks
      },
      card_block
    ]

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

  # Builds the ordered list of plan tasks for the given review_type.
  #
  # Past returned/rejected ships for the same project are shown as prior attempts
  # (error tasks) before the current ship's stages.
  #
  # For requirements_check: prior RC attempts + time_audit + requirements_check + design_review (pending stub).
  # For design_review: prior DR attempts + time_audit + requirements_check + design_review.
  def self.build_plan_tasks(ship, review_type)
    tasks = []
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

      feedback = past_review.feedback.to_s.presence || past_review.status.to_s.capitalize
      label = "#{REVIEW_LABELS[review_type]} (attempt #{idx + 1})"

      tasks << build_task(
        task_id: "#{review_type}_past_#{past_ship.id}",
        title: label,
        status: "error",
        detail: feedback
      )
    end

    attempt_num = past_ships.size + 1
    current_label = past_ships.any? ? "#{REVIEW_LABELS[review_type]} (attempt #{attempt_num})" : nil

    case review_type
    when "requirements_check"
      tasks << review_task(ship.time_audit_review, "time_audit")
      tasks << review_task(ship.requirements_check_review, "requirements_check", label_override: current_label)
      tasks << pending_stub_task("design_review")
    when "design_review"
      tasks << review_task(ship.time_audit_review, "time_audit")
      tasks << review_task(ship.requirements_check_review, "requirements_check")
      tasks << review_task(ship.design_review, "design_review", label_override: current_label)
    end

    tasks.compact
  end
  private_class_method :build_plan_tasks

  def self.review_task(review, key, label_override: nil)
    return nil if review.nil?

    current_status = review.status.to_s
    plan_status = case current_status
    when "approved" then "complete"
    when "returned", "rejected" then "error"
    else "pending"
    end

    detail = review.feedback.to_s.presence || current_status.capitalize

    build_task(
      task_id: "#{key}_#{review.id}",
      title: label_override || REVIEW_LABELS[key],
      status: plan_status,
      detail: detail
    )
  end
  private_class_method :review_task

  def self.pending_stub_task(key)
    build_task(
      task_id: "#{key}_pending",
      title: REVIEW_LABELS[key],
      status: "pending",
      detail: "Not yet started"
    )
  end
  private_class_method :pending_stub_task

  def self.build_task(task_id:, title:, status:, detail:)
    {
      task_id: task_id,
      title: title,
      status: status,
      details: {
        type: "rich_text",
        elements: [ {
          type: "rich_text_section",
          elements: [ { type: "text", text: detail } ]
        } ]
      }
    }
  end
  private_class_method :build_task

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
