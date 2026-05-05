# Composites a project cover image with a review status overlay badge,
# resized to 800x600 (cover/fill), and returns an absolute URL to the
# resulting image stored as an anonymous ActiveStorage blob.
#
# Returns nil if no cover image is available or compositing fails.
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
    entry = JournalEntry.public_for_explore
      .where(project_id: project.id)
      .joins(:images_attachments)
      .order(created_at: :desc)
      .first
    return nil unless entry

    overlay_filename = OVERLAYS[[ review_type, review_status ]]
    return nil unless overlay_filename

    overlay_path = OVERLAY_DIR.join(overlay_filename)
    return nil unless overlay_path.exist?

    blob = entry.images.first.blob
    composited_blob = composite(blob, overlay_path)
    return nil unless composited_blob

    Rails.application.routes.url_helpers.rails_blob_url(composited_blob, host: base_url)
  rescue StandardError
    nil
  end

  def self.composite(blob, overlay_path)
    Tempfile.create([ "review_card", ".jpg" ]) do |tmp|
      blob.open do |source|
        cover = Vips::Image.thumbnail(source.path, 800, height: 600, crop: :centre)
        overlay = Vips::Image.new_from_file(overlay_path.to_s)
        composited = cover.composite2(overlay, :over)
        composited.jpegsave(tmp.path, Q: 85)
      end

      ActiveStorage::Blob.create_and_upload!(
        io: File.open(tmp.path),
        filename: "review_card_#{SecureRandom.hex(8)}.jpg",
        content_type: "image/jpeg"
      )
    end
  end
  private_class_method :composite
end
