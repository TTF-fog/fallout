class BackfillExistingShipsWithReviews < ActiveRecord::Migration[8.1]
  def up
    Ship.find_each do |ship|
      status_map = { "pending" => 0, "approved" => 1, "returned" => 2, "rejected" => 3 }
      review_status = status_map[ship.status] || 0

      # Phase-1 reviews mirror current ship status
      TimeAuditReview.find_or_create_by!(ship_id: ship.id) do |r|
        r.status = review_status
        r.reviewer_id = ship.reviewer_id
        r.approved_seconds = ship.approved_seconds
        r.feedback = ship.feedback
      end

      RequirementsCheckReview.find_or_create_by!(ship_id: ship.id) do |r|
        r.status = review_status
        r.reviewer_id = ship.reviewer_id
        r.feedback = ship.feedback
      end

      # Phase-2 review only for non-pending ships (they passed phase-1)
      next if ship.pending?

      DesignReview.find_or_create_by!(ship_id: ship.id) do |r|
        r.status = review_status
        r.reviewer_id = ship.reviewer_id
        r.feedback = ship.feedback
      end
    end
  end

  def down
    TimeAuditReview.delete_all
    RequirementsCheckReview.delete_all
    DesignReview.delete_all
    BuildReview.delete_all
  end
end
