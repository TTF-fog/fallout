if defined?(Rack::MiniProfiler)
  Rack::MiniProfiler.config.authorization_mode = :allow_authorized
  Rack::MiniProfiler.config.enable_advanced_debugging_tools = true

  # Disable ?pp=env — it dumps full ENV (RAILS_MASTER_KEY, SENTRY_AUTH_TOKEN, DATABASE_URL passwords)
  # AND the Rack env hash (cookies, auth headers). No granular config exists, so we override the dispatcher.
  Rack::MiniProfiler.prepend(Module.new do
    def dump_env(_env)
      text_result("?pp=env is disabled in this app for security. See config/initializers/rack_mini_profiler.rb.")
    end
  end)
end
