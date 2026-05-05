class SlackInteractionsController < ApplicationController
  MAIN_CHANNEL_ID = ENV["MAIN_CHANNEL_ID"]
  allow_unauthenticated_access only: :create # Slack button callbacks are authenticated by Slack request signatures, not user sessions.
  allow_trial_access only: :create # Slack callbacks may arrive with any browser cookies; signature verification is the access control.
  skip_onboarding_redirect only: :create # Slack callbacks are server-to-server and must not enter user onboarding.
  skip_before_action :verify_authenticity_token, only: :create # Slack cannot submit Rails CSRF tokens; verify Slack HMAC instead.
  skip_after_action :verify_authorized # No app user authorization applies to Slack-signed moderation callbacks.
  skip_after_action :verify_policy_scoped # No index action or policy-scoped collection.
  def create
    payload = JSON.parse(params[:payload].to_s)
    return head :unauthorized unless valid_slack_request?(payload)

    action = payload.fetch("actions", []).first
    return head :ok unless payload["type"] == "block_actions" && action&.dig("action_id") == "approve_project_kudo"

    kudo = ProjectKudo.find(action.fetch("value"))
    unless kudo.approved?
      kudo.approve!
      SlackResponseUrlJob.perform_later(
        payload.fetch("response_url"),
        approved_message(payload),
        thread_ts: payload.dig("message", "ts") || payload.dig("container", "message_ts")
      )
      SlackMsgJob.perform_later(MAIN_CHANNEL_ID, slack_message(kudo))

      recipient_slack_id = kudo.recipient.slack_id
      SlackMsgJob.perform_later(recipient_slack_id, recipient_message(kudo)) if recipient_slack_id.present?
    end

    head :ok
  rescue JSON::ParserError, ActiveRecord::RecordNotFound, KeyError
    head :bad_request
  end

  private

  def valid_slack_request?(payload)
    valid_slack_signature? || valid_slack_verification_token?(payload)
  end

  def valid_slack_signature?
    signing_secret = ENV["SLACK_SIGNING_SECRET"]
    timestamp = request.headers["X-Slack-Request-Timestamp"].to_s
    signature = request.headers["X-Slack-Signature"].to_s
    return false if signing_secret.blank? || timestamp.blank? || signature.blank?
    return false if (Time.current.to_i - timestamp.to_i).abs > 5.minutes

    expected = "v0=#{OpenSSL::HMAC.hexdigest("SHA256", signing_secret, "v0:#{timestamp}:#{request.raw_post}")}"
    ActiveSupport::SecurityUtils.secure_compare(expected, signature)
  end

  def valid_slack_verification_token?(payload)
    verification_token = ENV["SLACK_VERIFICATION_TOKEN"]
    payload_token = payload["token"].to_s
    return false if verification_token.blank? || payload_token.blank?

    ActiveSupport::SecurityUtils.secure_compare(verification_token, payload_token)
  end

  def approved_message(payload)
    approver = payload.dig("user", "id").presence || payload.dig("user", "name").presence || "idk bro"
    "approved by <@#{approver}>"
  end

  def slack_message(kudo)
    "<@#{kudo.sender.slack_id}> has sent <@#{kudo.recipient.slack_id}>'s #{project_slack_link(kudo.project)} a kudos! #{slack_escape(kudo.text.to_s)}"
  end

  def recipient_message(kudo)
    "Your project #{project_slack_link(kudo.project)} received kudos: #{slack_escape(kudo.text.to_s)}"
  end

  def project_slack_link(project)
    "<#{project_url(project)}|#{slack_escape(project.name)}>"
  end

  def slack_escape(msg)
    ERB::Util.html_escape(msg)
  end
end
