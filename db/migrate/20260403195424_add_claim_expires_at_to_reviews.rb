class AddClaimExpiresAtToReviews < ActiveRecord::Migration[8.1]
  def change
    %i[time_audit_reviews requirements_check_reviews design_reviews build_reviews].each do |table|
      add_column table, :claim_expires_at, :datetime
      add_index table, [ :status, :claim_expires_at ]
    end
  end
end
