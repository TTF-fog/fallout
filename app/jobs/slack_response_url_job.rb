require "net/http"
require "uri"

class SlackResponseUrlJob < ApplicationJob
  queue_as :default
  limits_concurrency to: 1, key: "slack_api" # Share Slack's workspace-level rate limit with other Slack jobs.

  def perform(response_url, text, thread_ts: nil)
    uri = URI(response_url)
    raise ArgumentError, "Slack response_url must be HTTPS" unless uri.is_a?(URI::HTTPS)

    payload = {
      text: text,
      response_type: "in_channel",
      replace_original: false
    }
    payload[:thread_ts] = thread_ts if thread_ts.present?

    response = Net::HTTP.post(uri, payload.to_json, "Content-Type" => "application/json")
    raise "Slack response_url POST failed: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    sleep 1.1 # Stay under Slack's ~1 msg/sec workspace rate limit
  end
end
