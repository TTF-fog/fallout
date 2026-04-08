class Admin::DashboardController < Admin::ApplicationController
  skip_after_action :verify_authorized, only: %i[index] # No authorizable resource; staff access enforced by Admin::ApplicationController
  skip_after_action :verify_policy_scoped, only: %i[index] # No scoped collection

  def index; end
end
