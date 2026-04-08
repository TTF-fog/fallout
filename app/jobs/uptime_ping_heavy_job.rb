class UptimePingHeavyJob < ApplicationJob
  queue_as :heavy

  def perform
    url = ENV["UPTIME_HEAVY_WORKER_PING_URL"]
    unless url.present?
      Rails.logger.warn "UPTIME_HEAVY_WORKER_PING_URL not set, skipping heavy worker uptime ping"
      return
    end

    begin
      response = Faraday.get(url)

      unless response.success?
        ErrorReporter.capture_message("Heavy worker uptime ping failed", level: :warning, contexts: {
          uptime: { status: response.status }
        })
      end
    rescue => e
      ErrorReporter.capture_exception(e, contexts: { uptime: { url: url } })
    end
  end
end
