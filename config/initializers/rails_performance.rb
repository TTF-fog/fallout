# Stop Inertia from hijacking the engine's HTML responses. Inertia's `default_render = true`
# would otherwise force the engine through inertia.html.erb (which fails in the engine context
# because it doesn't have current_user, and pulls in Vite tags blocked by the engine's CSP).
Rails.application.config.to_prepare do
  if defined?(RailsPerformance::BaseController) && RailsPerformance::BaseController.respond_to?(:inertia_config)
    RailsPerformance::BaseController.inertia_config(default_render: false)
  end
end

if defined?(RailsPerformance)
  RailsPerformance.setup do |config|
    config.redis = Redis.new(url: ENV["REDIS_URL"].presence)
    config.duration = 6.hours
    config.recent_requests_time_window = 60.minutes
    config.slow_requests_time_window = 4.hours
    config.slow_requests_threshold = 500 # ms

    # Noop in dev — no Redis available locally; mirrors flavortown's pattern
    config.enabled = ENV["REDIS_URL"].present?

    # Auto-mount path. We also mount manually under Constraints::AdminConstraint in routes.rb;
    # the gem's auto-mount silently no-ops on the duplicate (rescue ArgumentError in its routes.rb).
    # mount_at must match the manual mount path so internal links resolve correctly.
    config.mount_at = "/admin/performance"

    # Defense-in-depth — AdminConstraint already 404s non-admins at the routing layer.
    # The engine's BaseController inherits ActionController::Base (not ApplicationController),
    # so current_user isn't available; read the session directly.
    config.http_basic_authentication_enabled = false
    config.verify_access_proc = proc { |controller|
      user_id = controller.session[:user_id]
      user_id.present? && User.find_by(id: user_id)&.admin?
    }

    config.ignored_paths = [ "/admin/performance" ]
    config.home_link = "/"
    config.include_rake_tasks = false
    config.include_custom_events = true
  end
end
