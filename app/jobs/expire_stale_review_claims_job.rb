# Safety net: clears expired claims on pending reviews so the index
# displays correctly and stale reviewer_ids don't linger.
class ExpireStaleReviewClaimsJob < ApplicationJob
  queue_as :background

  def perform
    Reviewable::REVIEW_MODELS.each do |name|
      name.constantize
        .pending
        .where("claim_expires_at < ?", Time.current)
        .where.not(reviewer_id: nil)
        .update_all(reviewer_id: nil, claim_expires_at: nil)
    end
  end
end
