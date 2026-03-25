class ProjectsController < ApplicationController
  allow_trial_access only: %i[index show new create edit update destroy onboarding] # Trial users can manage their single project
  before_action :set_project, only: %i[show edit update destroy]

  def onboarding
    authorize :project, :onboarding? # Policy gate for project onboarding access

    render inertia: "projects/onboarding/index", props: {
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end

  def index
    scope = policy_scope(Project).where(user: current_user)
    if collaborators_enabled?
      collaborated_ids = Collaborator.kept.where(user: current_user, collaboratable_type: "Project").select(:collaboratable_id)
      scope = scope.or(Project.kept.where(id: collaborated_ids))
    end
    scope = scope.includes(kept_journal_entries: [ :recordings, { images_attachments: :blob } ])
    scope = scope.search(params[:query]) if params[:query].present?
    @pagy, @projects = pagy(scope.order(created_at: :desc))

    render inertia: {
      projects: @projects.map { |p| serialize_project_card(p) },
      pagy: pagy_props(@pagy),
      query: params[:query].to_s,
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end

  def show
    authorize @project

    journal_entries = @project.journal_entries.kept
      .includes(:user, :recordings, :collaborator_users, images_attachments: :blob)
      .order(created_at: :desc)

    collab_enabled = collaborators_enabled?

    render inertia: {
      project: serialize_project_detail(@project),
      journal_entries: journal_entries.map { |je| serialize_journal_entry_card(je) },
      collaborators: collab_enabled ? @project.collaborators.includes(:user).map { |c|
        { id: c.id, user_id: c.user.id, display_name: c.user.display_name, avatar: c.user.avatar }
      } : [],
      pending_invites: collab_enabled && policy(@project).manage_collaborators? ?
        @project.collaboration_invites.pending.includes(:invitee).map { |i|
          { id: i.id, invitee_display_name: i.invitee.display_name, invitee_avatar: i.invitee.avatar, created_at: i.created_at.strftime("%B %d, %Y") }
        } : [],
      can: {
        update: policy(@project).update?,
        destroy: policy(@project).destroy?,
        manage_collaborators: collab_enabled && policy(@project).manage_collaborators?,
        create_journal_entry: JournalEntryPolicy.new(current_user, @project.journal_entries.build(user: current_user)).create?
      },
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end

  def new
    @project = current_user.projects.build
    authorize @project

    render inertia: "projects/form", props: {
      project: { name: "", description: "", demo_link: "", repo_link: "", is_unlisted: false, tags: [] },
      title: "New Project",
      submit_url: projects_path,
      method: "post",
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end

  def create
    @project = current_user.projects.build(project_params)
    authorize @project

    if @project.save
      # Redirect to path when created from the onboarding modal so it closes and tooltips update
      destination = params[:return_to] == "path" ? path_path : @project
      redirect_to destination, notice: "Project created."
    else
      redirect_back fallback_location: new_project_path, inertia: { errors: @project.errors.messages }
    end
  end

  def edit
    authorize @project

    render inertia: "projects/form", props: {
      project: {
        id: @project.id,
        name: @project.name,
        description: @project.description.to_s,
        demo_link: @project.demo_link.to_s,
        repo_link: @project.repo_link.to_s,
        is_unlisted: @project.is_unlisted,
        tags: @project.tags
      },
      title: "Edit Project",
      submit_url: project_path(@project),
      method: "patch"
    }
  end

  def update
    authorize @project

    if @project.update(project_params)
      redirect_to @project, notice: "Project updated."
    else
      redirect_back fallback_location: edit_project_path(@project), inertia: { errors: @project.errors.messages }
    end
  end

  def destroy
    authorize @project
    @project.discard
    redirect_to projects_path, notice: "Project deleted."
  end

  private

  def set_project
    @project = Project.kept.find(params[:id])
  end

  def project_params
    params.expect(project: [ :name, :description, :demo_link, :repo_link, :is_unlisted, tags: [] ])
  end

  def serialize_project_card(project)
    kept_entries = project.kept_journal_entries
    cover_entry = kept_entries.select { |je| je.images.any? }.max_by(&:created_at)
    {
      id: project.id,
      name: project.name,
      description: project.description&.truncate(200),
      is_unlisted: project.is_unlisted,
      tags: project.tags,
      cover_image_url: cover_entry&.images&.first&.then { |img| url_for(img) },
      journal_entries_count: kept_entries.size,
      time_logged: project.time_logged,
      recordings_count: kept_entries.sum { |je| je.recordings.size },
      is_collaborator: project.user_id != current_user.id # True when viewing a project you collaborate on (not own)
    }
  end

  def serialize_project_detail(project)
    {
      id: project.id,
      name: project.name,
      description: project.description,
      demo_link: project.demo_link,
      repo_link: project.repo_link,
      is_unlisted: project.is_unlisted,
      tags: project.tags,
      user_display_name: project.user.display_name,
      created_at: project.created_at.strftime("%B %d, %Y")
    }
  end

  def serialize_journal_entry_card(journal_entry)
    {
      id: journal_entry.id,
      content_html: helpers.render_user_markdown(journal_entry.content.to_s),
      images: journal_entry.images.map { |img| url_for(img) },
      recordings_count: journal_entry.recordings.size,
      created_at: journal_entry.created_at.strftime("%B %d, %Y"),
      author_display_name: journal_entry.user.display_name,
      collaborators: journal_entry.collaborator_users.map { |u| { display_name: u.display_name, avatar: u.avatar } }
    }
  end
end
