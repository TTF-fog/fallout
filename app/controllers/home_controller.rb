class HomeController < ApplicationController
  def index
    render inertia: {
      user: {
        display_name: current_user.display_name,
        email: current_user.email
      }
    }
  end
end
