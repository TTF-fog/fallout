# == Schema Information
#
# Table name: time_audit_reviews
#
#  id               :bigint           not null, primary key
#  annotations      :jsonb
#  approved_seconds :integer
#  claim_expires_at :datetime
#  feedback         :text
#  lock_version     :integer          default(0), not null
#  status           :integer          default("pending"), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  reviewer_id      :bigint
#  ship_id          :bigint           not null
#
# Indexes
#
#  index_time_audit_reviews_on_reviewer_id                  (reviewer_id)
#  index_time_audit_reviews_on_ship_id                      (ship_id) UNIQUE
#  index_time_audit_reviews_on_status                       (status)
#  index_time_audit_reviews_on_status_and_claim_expires_at  (status,claim_expires_at)
#
# Foreign Keys
#
#  fk_rails_...  (reviewer_id => users.id)
#  fk_rails_...  (ship_id => ships.id)
#
class TimeAuditReview < ApplicationRecord
  include Reviewable

  def self.review_id_prefix
    "TA"
  end

  def self.extra_review_field_mappings
    {
      "Approved Hours" => ->(r) { (r.approved_seconds.to_f / 3600.0).round(2) }
    }
  end
end
