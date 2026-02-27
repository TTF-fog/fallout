class DashboardController < ApplicationController
  def index
    render inertia: "Dashboard/Index", props: {
      user: {
        display_name: current_user.display_name,
        email: current_user.email
      }
    }
  end
end
