class PathController < ApplicationController
  allow_trial_access only: %i[index] # Trial users can view their path
  skip_after_action :verify_authorized, only: %i[index] # No authorizable resource
  skip_after_action :verify_policy_scoped, only: %i[index] # No scoped collection

  def index
    journal_entries = current_user.journal_entries.kept.includes(:critter).order(:created_at)

    render inertia: {
      user: {
        display_name: current_user.display_name,
        email: current_user.email,
        koi: current_user.koi,
        avatar: current_user.avatar
      },
      has_projects: current_user.projects.kept.exists? || (collaborators_enabled? && Collaborator.kept.where(user: current_user, collaboratable_type: "Project").exists?),
      journal_entry_count: journal_entries.size,
      # Critter variant per journal entry (by creation order), nil if no critter was awarded
      critter_variants: journal_entries.map { |je| je.critter&.variant }
    }
  end
end
