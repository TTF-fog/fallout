class JournalsController < ApplicationController
  allow_trial_access only: %i[new] # Trial users can access journal creation
  skip_after_action :verify_authorized # No index action — blanket skip required (Rails 8.1 callback validation)
  skip_after_action :verify_policy_scoped # No index action — blanket skip required (Rails 8.1 callback validation)

  def new
    projects = current_user.projects.kept

    if params[:project_id]
      @project = projects.find(params[:project_id])
      authorize @project, :show? # User must own or have access to the project
    else
      skip_authorization # No specific project to authorize against
    end

    render inertia: "journals/new", props: {
      projects: projects.map { |p| { id: p.id, name: p.name } },
      selected_project_id: @project&.id,
      lapse_connected: current_user.lapse_token.present?,
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end
end
