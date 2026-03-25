class CollaborationInvitesController < ApplicationController
  # No index action — blanket skip required (Rails 8.1 callback validation)
  skip_after_action :verify_authorized
  skip_after_action :verify_policy_scoped

  before_action :require_collaborators_feature! # Gated behind :collaborators feature flag
  before_action :set_invite

  def show
    authorize @invite # Only invitee, inviter, or admin can view

    render inertia: "collaboration_invites/show", props: {
      invite: serialize_invite(@invite),
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end

  def accept
    authorize @invite # Only the invitee can accept, and only while pending

    ActiveRecord::Base.transaction do
      @invite.accepted!
      @invite.project.collaborators.create!(user: @invite.invitee)
    end

    redirect_to project_path(@invite.project), notice: "You are now a collaborator on #{@invite.project.name}."
  end

  def decline
    authorize @invite # Only the invitee can decline, and only while pending

    @invite.declined!
    redirect_to path_path, notice: "Invite declined."
  end

  private

  def set_invite
    @invite = CollaborationInvite.find(params[:id])
  end

  def require_collaborators_feature!
    return if collaborators_enabled?
    redirect_back fallback_location: root_path, alert: "This feature is not available."
  end

  def serialize_invite(invite)
    {
      id: invite.id,
      status: invite.status,
      project_name: invite.project.name,
      project_id: invite.project_id,
      inviter_display_name: invite.inviter.display_name,
      inviter_avatar: invite.inviter.avatar,
      created_at: invite.created_at.strftime("%B %d, %Y")
    }
  end
end
