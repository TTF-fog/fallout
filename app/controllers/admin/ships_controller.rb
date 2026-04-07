class Admin::ShipsController < Admin::ApplicationController
  before_action :set_ship, only: %i[show]

  def index
    @pagy, @ships = pagy(policy_scope(Ship).includes(:project, :reviewer, project: :user).order(created_at: :desc))

    render inertia: {
      ships: @ships.map { |s| serialize_ship_row(s) },
      pagy: pagy_props(@pagy)
    }
  end

  def show
    authorize @ship

    render inertia: {
      ship: serialize_ship_detail(@ship)
    }
  end

  private

  def set_ship
    @ship = Ship.includes(:time_audit_review, :requirements_check_review, :design_review, :build_review, project: :user).find(params[:id])
  end

  def serialize_ship_row(ship)
    {
      id: ship.id,
      project_name: ship.project.name,
      user_display_name: ship.project.user.display_name,
      status: ship.status,
      reviewer_display_name: ship.reviewer&.display_name,
      created_at: ship.created_at.strftime("%b %d, %Y")
    }
  end

  def serialize_ship_detail(ship)
    public_hrs = ship.approved_seconds ? (ship.approved_seconds / 3600.0).round(1) : nil
    internal_hrs = compute_internal_hours(ship)
    {
      id: ship.id,
      status: ship.status,
      approved_public_hours: public_hrs,
      approved_internal_hours: internal_hrs,
      feedback: ship.feedback,
      justification: ship.justification,
      frozen_demo_link: ship.frozen_demo_link,
      frozen_repo_link: ship.frozen_repo_link,
      project_name: ship.project.name,
      user_display_name: ship.project.user.display_name,
      review_statuses: {
        time_audit: ship.time_audit_review&.status,
        requirements_check: ship.requirements_check_review&.status,
        design_review: ship.design_review&.status,
        build_review: ship.build_review&.status
      },
      created_at: ship.created_at.strftime("%B %d, %Y")
    }
  end

  def compute_internal_hours(ship)
    base = ship.approved_seconds || 0
    dr_adj = ship.design_review&.hours_adjustment || 0
    br_adj = ship.build_review&.hours_adjustment || 0
    total = base + dr_adj + br_adj
    return nil if base.zero? && dr_adj.zero? && br_adj.zero?
    (total / 3600.0).round(1)
  end
end
