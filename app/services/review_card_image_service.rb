# Composites a project cover image with a review status overlay badge,
# resized to 800x600 (cover/fill), and returns an absolute URL to the
# resulting image stored as an anonymous ActiveStorage blob.
#
# Source priority: zine from repo (via UnifiedScreenshotFinder) > journal entry image.
# PDFs are rasterised to a PNG of their first page before compositing.
#
# Returns nil if no source image is available or compositing fails.
class ReviewCardImageService
  OVERLAY_DIR = Rails.root.join("public", "review_overlays")

  OVERLAYS = {
    [ "requirements_check", "approved"  ] => "reqcheckcomplete.png",
    [ "requirements_check", "returned"  ] => "reqcheckreject.png",
    [ "requirements_check", "rejected"  ] => "reqcheckreject.png",
    [ "design_review",      "approved"  ] => "designreviewcomplete.png",
    [ "design_review",      "returned"  ] => "designreviewreject.png",
    [ "design_review",      "rejected"  ] => "designreviewreject.png"
  }.freeze

  def self.call(project:, review_type:, review_status:, base_url:)
    overlay_filename = OVERLAYS[[ review_type, review_status ]]
    return nil unless overlay_filename

    overlay_path = OVERLAY_DIR.join(overlay_filename)
    return nil unless overlay_path.exist?

    source_path = direct_zine_source_path(project) || zine_source_path(project) || journal_source_path(project)
    unless source_path
      Rails.logger.warn("ReviewCardImageService: no source image for project ##{project.id}")
      return nil
    end

    composited_blob = composite(source_path, overlay_path)
    return nil unless composited_blob

    Rails.application.routes.url_helpers.rails_blob_url(composited_blob, host: base_url)
  rescue StandardError => e
    Rails.logger.warn("ReviewCardImageService failed for project ##{project.id}: #{e.message}")
    nil
  end

  # Downloads the zine URL from UnifiedScreenshotFinder and writes it to a
  # tempfile. Returns the tempfile path, or nil if not found/downloadable.
  def self.direct_zine_source_path(project)
    nwo = github_nwo(project.repo_link)
    return nil unless nwo

    urls = [
      "https://raw.githubusercontent.com/#{nwo}/main/zine.png",
      "https://raw.githubusercontent.com/#{nwo}/main/zine.pdf",
      "https://raw.githubusercontent.com/#{nwo}/master/zine.png",
      "https://raw.githubusercontent.com/#{nwo}/master/zine.pdf"
    ]

    urls.each do |url|
      ext = File.extname(URI.parse(url).path).downcase.presence || ".png"
      tmp = Tempfile.new([ "zine_source", ext ])
      tmp.binmode

      require "open-uri"
      URI.open(url, read_timeout: 8) { |io| tmp.write(io.read) } # rubocop:disable Security/Open
      tmp.flush
      return tmp.path
    rescue OpenURI::HTTPError
      next
    end

    nil
  rescue StandardError => e
    Rails.logger.warn("ReviewCardImageService.direct_zine_source_path failed for project ##{project.id}: #{e.message}")
    nil
  end
  private_class_method :direct_zine_source_path

  def self.zine_source_path(project)
    url = ShipChecks::UnifiedScreenshotFinder.find_url(project)
    unless url.present?
      Rails.logger.warn("ReviewCardImageService: no zine URL for project ##{project.id}")
      return nil
    end

    ext = File.extname(URI.parse(url).path).downcase.presence || ".png"
    tmp = Tempfile.new([ "zine_source", ext ])
    tmp.binmode

    require "open-uri"
    URI.open(url, read_timeout: 10) { |io| tmp.write(io.read) } # rubocop:disable Security/Open
    tmp.flush
    tmp.path
  rescue StandardError => e
    Rails.logger.warn("ReviewCardImageService.zine_source_path failed for project ##{project.id}: #{e.message}")
    nil
  end
  private_class_method :zine_source_path

  def self.github_nwo(repo_link)
    return nil if repo_link.blank?

    path = URI.parse(repo_link).path.to_s.sub(%r{\A/}, "").sub(/\.git\z/, "")
    parts = path.split("/")
    return nil if parts.size < 2

    "#{parts[0]}/#{parts[1]}"
  rescue URI::InvalidURIError
    nil
  end
  private_class_method :github_nwo

  # Writes the most recent journal entry image blob to a tempfile.
  def self.journal_source_path(project)
    entry = JournalEntry.public_for_explore
      .where(project_id: project.id)
      .joins(:images_attachments)
      .order(created_at: :desc)
      .first
    return nil unless entry

    blob = entry.images.first.blob
    tmp = Tempfile.new([ "journal_source", File.extname(blob.filename.to_s).presence || ".jpg" ])
    tmp.binmode
    blob.open { |io| tmp.write(io.read) }
    tmp.flush
    tmp.path
  rescue StandardError
    nil
  end
  private_class_method :journal_source_path

  # If the source is a PDF, rasterise page 0 to a PNG tempfile first.
  def self.normalise_to_image(source_path)
    return source_path unless source_path.downcase.end_with?(".pdf")

    tmp = Tempfile.new([ "pdf_page", ".png" ])
    MiniMagick::Tool::Convert.new do |cmd|
      cmd << "#{source_path}[0]" # first page only
      cmd.density(150)
      cmd.background("white")
      cmd.flatten
      cmd << tmp.path
    end
    tmp.path
  rescue StandardError
    nil
  end
  private_class_method :normalise_to_image

  def self.composite(source_path, overlay_path)
    image_path = normalise_to_image(source_path)
    return nil unless image_path

    Tempfile.create([ "review_card", ".jpg" ]) do |tmp|
      cover = Vips::Image.thumbnail(image_path, 800, height: 600, crop: :centre)
      overlay = Vips::Image.new_from_file(overlay_path.to_s)
      cover.composite2(overlay, :over).jpegsave(tmp.path, Q: 85)

      ActiveStorage::Blob.create_and_upload!(
        io: File.open(tmp.path),
        filename: "review_card_#{SecureRandom.hex(8)}.jpg",
        content_type: "image/jpeg"
      )
    end
  end
  private_class_method :composite
end
