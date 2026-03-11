require "faraday"
require "json"

module YouTubeService
  class Error < StandardError; end

  VIDEO_ID_REGEX = %r{(?:youtube\.com/(?:watch\?.*v=|embed/|live/)|youtu\.be/)([a-zA-Z0-9_-]{11})}
  THUMBNAIL_QUALITIES = %w[default mqdefault hqdefault sddefault maxresdefault].freeze

  module_function

  def find_or_fetch(url)
    video_id = extract_video_id(url)
    return nil if video_id.blank?

    YouTubeVideo.find_by(video_id: video_id) || fetch_and_create(video_id)
  end

  def thumbnail_url(url, quality: "default")
    video_id = extract_video_id(url)
    return nil if video_id.blank?

    thumbnail_url_from_id(video_id, quality: quality)
  end

  def thumbnail_url_from_id(video_id, quality: "default")
    quality_key = THUMBNAIL_QUALITIES.include?(quality) ? quality : "default"
    "https://i.ytimg.com/vi/#{video_id}/#{quality_key}.jpg"
  end

  def extract_video_id(url)
    return nil if url.blank?
    url.to_s.match(VIDEO_ID_REGEX)&.[](1)
  end

  def fetch_and_create(video_id)
    attrs = fetch_video_data(video_id)
    return nil if attrs.nil?

    YouTubeVideo.create!(attrs)
  rescue ActiveRecord::RecordNotUnique
    YouTubeVideo.find_by(video_id: video_id)
  end

  def fetch_video_data(video_id)
    response = connection.get("/youtube/v3/videos") do |req|
      req.headers["Accept"] = "application/json"
      req.params["part"] = "snippet,contentDetails"
      req.params["id"] = video_id
      req.params["key"] = ENV.fetch("YOUTUBE_API_KEY", nil)
    end

    unless response.success?
      ErrorReporter.capture_message("YouTube video fetch failed", level: :warning, contexts: {
        youtube: { status: response.status, video_id: video_id }
      })
      return nil
    end

    data = JSON.parse(response.body)
    item = data.dig("items", 0)
    return nil if item.nil?

    snippet = item["snippet"]
    content = item["contentDetails"]

    {
      video_id: video_id,
      title: snippet["title"],
      description: snippet["description"],
      channel_id: snippet["channelId"],
      channel_title: snippet["channelTitle"],
      thumbnail_url: thumbnail_url_from_id(video_id),
      duration_seconds: parse_iso8601_duration(content["duration"]),
      published_at: snippet["publishedAt"],
      definition: content["definition"],
      caption: content["caption"] == "true",
      live_broadcast_content: snippet["liveBroadcastContent"],
      tags: snippet["tags"],
      category_id: snippet["categoryId"]
    }
  rescue StandardError => e
    ErrorReporter.capture_exception(e, level: :warning, contexts: { youtube: { action: "fetch_video_data", video_id: video_id } })
    nil
  end

  def parse_iso8601_duration(duration_string)
    return nil if duration_string.blank?
    match = duration_string.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    return nil unless match
    (match[1].to_i * 3600) + (match[2].to_i * 60) + match[3].to_i
  end

  def connection
    @connection ||= Faraday.new(url: "https://www.googleapis.com")
  end
end
