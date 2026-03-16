class SentryTestController < ApplicationController
  # No authorizable resource on this controller
  skip_after_action :verify_authorized
  skip_after_action :verify_policy_scoped

  def show
    render inertia: {}
  end
end
