# frozen_string_literal: true

require "tempfile"
# Addressable is a transitive dep of several gems but isn't autoloaded; require
# it explicitly so Addressable::URI is defined when the worker boots.
require "addressable/uri"

module ShipChecks
  # Downloads a source file, transcodes to JPEG via libvips, and shrinks
  # quality progressively until it fits the 5MB Airtable attachment cap.
  # Returns JPEG bytes on success, nil on any failure.
  #
  # Supports raster images handled natively by libvips (PNG/JPG/WEBP/GIF)
  # plus PDF (first page rendered via libpoppler — the production Docker
  # image installs libpoppler-glib8 explicitly so vips's PDF loader works).
  # SVG is skipped — that would need librsvg.
  module UnifiedScreenshotProcessor
    MAX_BYTES = 5 * 1024 * 1024
    JPEG_INITIAL_QUALITY = 85
    JPEG_MIN_QUALITY = 30
    MAX_DIMENSION = 2400
    PDF_RENDER_DPI = 150

    EXT_FOR_CONTENT_TYPE = {
      "image/png" => ".png",
      "image/jpeg" => ".jpg",
      "image/webp" => ".webp",
      "image/gif" => ".gif",
      "application/pdf" => ".pdf"
    }.freeze

    SUPPORTED_CONTENT_TYPES = EXT_FOR_CONTENT_TYPE.keys.freeze

    def self.process(url)
      bytes, content_type = download(url)
      return nil unless bytes && content_type

      unless SUPPORTED_CONTENT_TYPES.include?(content_type)
        Rails.logger.warn("UnifiedScreenshotProcessor: unsupported content_type=#{content_type} for url=#{url}")
        return nil
      end

      transcode_to_jpeg(bytes, content_type)
    rescue StandardError => e
      Rails.logger.error("UnifiedScreenshotProcessor failed for #{url}: #{e.class}: #{e.message}")
      nil
    end

    def self.transcode_to_jpeg(input_bytes, content_type)
      src_ext = EXT_FOR_CONTENT_TYPE.fetch(content_type)

      Tempfile.create([ "screenshot_src", src_ext ]) do |src|
        src.binmode
        src.write(input_bytes)
        src.flush

        Tempfile.create([ "screenshot_dst", ".jpg" ]) do |dst|
          quality = JPEG_INITIAL_QUALITY
          loop do
            pipeline = ImageProcessing::Vips.source(src.path)
            # vips's PDF loader needs page (default 0 is fine) and dpi to
            # control raster resolution; image loaders don't accept these so
            # we apply them only for PDFs to avoid invalid-option errors.
            pipeline = pipeline.loader(page: 0, dpi: PDF_RENDER_DPI) if content_type == "application/pdf"
            pipeline
              .resize_to_limit(MAX_DIMENSION, MAX_DIMENSION)
              .convert("jpg")
              .saver(quality: quality, strip: true)
              .call(destination: dst.path)

            size = File.size(dst.path)
            break if size <= MAX_BYTES
            break if quality <= JPEG_MIN_QUALITY
            quality -= 10
          end

          if File.size(dst.path) > MAX_BYTES
            Rails.logger.warn("UnifiedScreenshotProcessor: cannot fit under #{MAX_BYTES} bytes even at quality=#{JPEG_MIN_QUALITY}")
            return nil
          end

          File.binread(dst.path)
        end
      end
    end

    def self.download(url)
      uri = normalize_uri(url)
      return [ nil, nil ] unless uri

      response = Net::HTTP.get_response(uri)
      if response.is_a?(Net::HTTPRedirection)
        redirect = normalize_uri(response["location"])
        return [ nil, nil ] unless redirect
        response = Net::HTTP.get_response(redirect)
      end
      return [ nil, nil ] unless response.is_a?(Net::HTTPSuccess)
      [ response.body, response["content-type"].to_s.split(";").first&.strip ]
    rescue StandardError
      [ nil, nil ]
    end

    # Source URLs come from raw GitHub paths or markdown image refs that may
    # include spaces or non-ASCII characters (e.g. "ZINE page.png"). Ruby's
    # URI() raises on those; Addressable normalizes them into valid percent-
    # encoded form first.
    def self.normalize_uri(raw_url)
      return nil if raw_url.blank?
      URI(Addressable::URI.parse(raw_url).normalize.to_s)
    rescue StandardError
      nil
    end
  end
end
