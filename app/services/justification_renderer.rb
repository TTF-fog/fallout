# Renders config/justification_template.txt for a given Ship into the prose
# that lands in the YSWS Unified Submissions row's "Optional - Override Hours
# Spent Justification" field. Strips the comment header, substitutes
# {VAR} placeholders, and resolves {A|B|"literal"} fallback chains.
#
# All variables are scoped to the ship's current cycle — see the template's
# Glossary entry and agents-docs/arch-ship-and-koi.md §2 for the cycle
# definition.
class JustificationRenderer
  TEMPLATE_PATH = Rails.root.join("config", "justification_template.txt")

  def self.render(ship)
    new(ship).render
  end

  def initialize(ship)
    @ship = ship
  end

  def render
    self.class.body.gsub(/\{([^}]+)\}/) { resolve_expr(::Regexp.last_match(1)) }
  end

  # Body is the part after the second `---` line, with leading/trailing
  # whitespace stripped. Memoized at class level — the file rarely changes
  # within a process lifetime, but reload between deploys.
  def self.body
    @body ||= load_body
  end

  def self.load_body
    raw = File.read(TEMPLATE_PATH)
    parts = raw.split(/^---\s*$/, 3)
    raise "JustificationRenderer: template must contain a `---` comment block" if parts.size < 3
    parts.last.strip
  end

  # Resolves "VAR" or "A|B|\"literal\"" — first non-blank wins. If everything
  # is blank, the original `{expr}` is returned literal so typos / missing
  # data are visible in output rather than silently disappearing.
  def resolve_expr(expr)
    parts = split_pipe(expr)
    parts.each do |part|
      val = part.start_with?('"') && part.end_with?('"') ? part[1..-2] : variable_value(part)
      return val.to_s if val.present?
    end
    "{#{expr}}"
  end

  # Splits on `|` but not inside double-quoted segments.
  def split_pipe(expr)
    parts = []
    current = +""
    in_quote = false
    expr.each_char do |c|
      if c == '"'
        in_quote = !in_quote
        current << c
      elsif c == "|" && !in_quote
        parts << current.strip
        current = +""
      else
        current << c
      end
    end
    parts << current.strip
    parts
  end

  def variable_value(name)
    case name
    when "USER_NAME" then @ship.user.display_name
    when "PROJECT_NAME" then @ship.project.name
    when "PROJECT_DESCRIPTION" then @ship.project.description
    when "SHIP_ID" then @ship.id
    when "LOGGED_HOURS" then format_hours(logged_seconds)
    when "APPROVED_HOURS" then format_hours(@ship.approved_seconds.to_i)
    when "INTERNAL_HOURS" then format_hours(internal_seconds)
    when "TOTAL_DEFLATION" then format("%.1fh", total_deflation_seconds / 3600.0)
    when "JOURNAL_COUNT" then @ship.journal_entries.kept.count
    when "RECORDING_COUNT" then recording_count
    when "TIMETRACKING_METHODS" then timetracking_methods
    when "SHIP_TYPE" then @ship.ship_type
    when "TIME_AUDITOR" then reviewer_label(@ship.time_audit_review&.reviewer)
    when "REQUIREMENTS_CHECKER" then reviewer_label(@ship.requirements_check_review&.reviewer)
    when "2ND_PASS_REVIEWER" then reviewer_label(phase_two_review&.reviewer)
    when "SUBMITTED_AT" then @ship.created_at&.iso8601
    when "APPROVED_AT" then approved_at_iso8601
    when "SHIP_TYPE_MSG" then ship_type_msg
    when "ATTEMPTS_MSG" then attempts_msg
    when "KOI_AWARDED" then koi_awarded
    when "INTERNAL_NOTES" then phase_two_review&.internal_reason.presence
    when "REPO_URL" then @ship.frozen_repo_link
    when "DEMO_URL" then @ship.frozen_demo_link
    end
  end

  private

  def phase_two_review
    @ship.design_review || @ship.build_review
  end

  def reviewer_label(user)
    return nil unless user
    "#{user.display_name} (#{user.email})"
  end

  # Logged seconds for this ship's cycle — sum of recording durations across
  # journal entries claimed by this ship. Reuses Ship.batch_time_logged so we
  # match the airtable mirror's numbers exactly.
  def logged_seconds
    @logged_seconds ||= Ship.batch_time_logged([ @ship.id ])[@ship.id].to_i
  end

  def internal_seconds
    dr = @ship.design_review&.hours_adjustment.to_i
    br = @ship.build_review&.hours_adjustment.to_i
    @ship.approved_seconds.to_i + dr + br
  end

  # Sum of hours REMOVED across TA and Phase 2, expressed as positive seconds.
  #   TA component: max(0, logged - approved)
  #   Phase 2 component: max(0, -hours_adjustment) per applicable review
  def total_deflation_seconds
    ta = [ logged_seconds - @ship.approved_seconds.to_i, 0 ].max
    dr = [ -@ship.design_review&.hours_adjustment.to_i, 0 ].max
    br = [ -@ship.build_review&.hours_adjustment.to_i, 0 ].max
    ta + dr + br
  end

  def format_hours(seconds)
    format("%.1f", seconds / 3600.0)
  end

  def recording_count
    Recording.joins(:journal_entry)
             .where(journal_entries: { ship_id: @ship.id, discarded_at: nil })
             .count
  end

  # Methods actually used in this cycle's recordings. Order is fixed
  # (Lapse → Lookout → YouTube upload); methods with zero recordings are
  # skipped from the joined phrase.
  def timetracking_methods
    types = Recording.joins(:journal_entry)
                     .where(journal_entries: { ship_id: @ship.id, discarded_at: nil })
                     .distinct
                     .pluck(:recordable_type)
    items = []
    items << "Lapse" if types.include?("LapseTimelapse")
    items << "Lookout" if types.include?("LookoutTimelapse")
    items << "YouTube upload" if types.include?("YouTubeVideo")
    join_phrase(items)
  end

  # Non-Oxford join: "A", "A and B", "A, B and C".
  def join_phrase(items)
    return "" if items.empty?
    return items.first if items.size == 1
    return "#{items[0]} and #{items[1]}" if items.size == 2
    "#{items[0..-2].join(", ")} and #{items.last}"
  end

  def ship_type_msg
    prior_types = @ship.project.ships.approved
                       .where("ships.created_at < ?", @ship.created_at)
                       .where.not(id: @ship.id)
                       .distinct.pluck(:ship_type)
    type = @ship.ship_type
    other_type = type == "design" ? "build" : "design"
    if prior_types.include?(type)
      type == "design" ? "update to a design" : "update to their build"
    elsif prior_types.include?(other_type)
      "first #{type} ship of their prior #{other_type}"
    else
      "first #{type} ship"
    end
  end

  def attempts_msg
    cutoff = @ship.previous_approved_ship&.created_at || Time.at(0)
    attempts = @ship.project.ships
                    .where("created_at > ? AND created_at <= ?", cutoff, @ship.created_at)
                    .count
    rounds = attempts - 1
    case rounds
    when 0..0 then "without needing additional feedback"
    when 1 then "after 1 round of feedback"
    else "after #{rounds} rounds of feedback"
    end
  end

  def approved_at_iso8601
    approved_int = Ship.statuses["approved"]
    version = @ship.versions
                   .reorder(:created_at)
                   .find { |v| (v.object_changes&.dig("status") || [])[1] == approved_int }
    (version&.created_at || @ship.updated_at)&.iso8601
  end

  def koi_awarded
    KoiTransaction.where(ship_id: @ship.id, reason: "ship_review").sum(:amount)
  end
end
