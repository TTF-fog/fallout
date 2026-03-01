class TestController < ApplicationController
  allow_unauthenticated_access only: %i[index]
  allow_trial_access only: %i[index]

  def index
    render inertia: "test/index"
  end
end
