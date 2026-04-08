namespace :seed do
  desc "Pull users, projects, journals, recordings from prod and create ships for review testing"
  task from_prod: :environment do
    prod_url = ENV.fetch("PROD_DATABASE_URL") { abort "Set PROD_DATABASE_URL in .env" }
    prod = PG.connect(prod_url)

    # 5 users with good recording variety
    user_ids = [2342, 69, 65, 37, 2539] # Felix, the_idk, KK, cooper, Creative Drone

    id_map = { users: {}, projects: {}, journal_entries: {}, lookout_timelapses: {}, lapse_timelapses: {}, you_tube_videos: {} }

    puts "=== Pulling users ==="
    users_data = prod.exec_params(
      "SELECT id, display_name, email, avatar, array_to_json(roles)::text as roles, slack_id, timezone, type, is_adult, onboarded, verification_status, created_at
       FROM users WHERE id = ANY($1)", ["{#{user_ids.join(",")}}"]
    )
    users_data.each do |row|
      existing = User.find_by(email: row["email"])
      if existing
        id_map[:users][row["id"].to_i] = existing.id
        puts "  #{row["display_name"]} already exists (id=#{existing.id})"
        next
      end

      u = User.new(
        display_name: row["display_name"],
        email: row["email"],
        avatar: row["avatar"],
        roles: JSON.parse(row["roles"] || "[]"),
        slack_id: row["slack_id"],
        timezone: row["timezone"],
        type: row["type"],
        is_adult: row["is_adult"] == "t",
        onboarded: row["onboarded"] == "t",
        verification_status: row["verification_status"],
        created_at: row["created_at"]
      )
      u.save!(validate: false)
      id_map[:users][row["id"].to_i] = u.id
      puts "  #{u.display_name} (prod=#{row["id"]} → local=#{u.id})"
    end

    puts "\n=== Pulling projects ==="
    projects_data = prod.exec_params(
      "SELECT id, name, description, repo_link, demo_link, is_unlisted, tags::text, user_id, created_at
       FROM projects WHERE user_id = ANY($1) AND discarded_at IS NULL", ["{#{user_ids.join(",")}}"]
    )
    projects_data.each do |row|
      local_user_id = id_map[:users][row["user_id"].to_i]
      next unless local_user_id

      p = Project.new(
        name: row["name"],
        description: row["description"],
        repo_link: row["repo_link"],
        demo_link: row["demo_link"],
        is_unlisted: row["is_unlisted"] == "t",
        tags: JSON.parse(row["tags"] || "[]"),
        user_id: local_user_id,
        created_at: row["created_at"]
      )
      p.save!(validate: false)
      id_map[:projects][row["id"].to_i] = p.id
      puts "  #{p.name} (prod=#{row["id"]} → local=#{p.id})"
    end

    puts "\n=== Pulling journal entries ==="
    prod_project_ids = id_map[:projects].keys
    je_data = prod.exec_params(
      "SELECT id, content, project_id, user_id, created_at
       FROM journal_entries WHERE project_id = ANY($1) AND discarded_at IS NULL
       ORDER BY created_at", ["{#{prod_project_ids.join(",")}}"]
    )
    je_data.each do |row|
      local_project_id = id_map[:projects][row["project_id"].to_i]
      local_user_id = id_map[:users][row["user_id"].to_i]
      next unless local_project_id && local_user_id

      je = JournalEntry.new(
        content: row["content"],
        project_id: local_project_id,
        user_id: local_user_id,
        created_at: row["created_at"]
      )
      je.save!(validate: false)
      id_map[:journal_entries][row["id"].to_i] = je.id
    end
    puts "  Pulled #{id_map[:journal_entries].size} journal entries"

    puts "\n=== Pulling recordings + recordables ==="
    prod_je_ids = id_map[:journal_entries].keys
    return puts("  No journal entries found, skipping recordings") if prod_je_ids.empty?

    rec_data = prod.exec_params(
      "SELECT id, recordable_type, recordable_id, journal_entry_id, user_id, created_at
       FROM recordings WHERE journal_entry_id = ANY($1)
       ORDER BY created_at", ["{#{prod_je_ids.join(",")}}"]
    )

    # Collect recordable IDs by type
    recordable_ids = { "LookoutTimelapse" => [], "LapseTimelapse" => [], "YouTubeVideo" => [] }
    rec_data.each { |r| recordable_ids[r["recordable_type"]] << r["recordable_id"].to_i }

    # Pull LookoutTimelapses
    unless recordable_ids["LookoutTimelapse"].empty?
      puts "  Pulling #{recordable_ids["LookoutTimelapse"].size} LookoutTimelapses..."
      lt_data = prod.exec_params(
        "SELECT id, user_id, session_token, name, duration, playback_url, thumbnail_url, created_at
         FROM lookout_timelapses WHERE id = ANY($1)", ["{#{recordable_ids["LookoutTimelapse"].join(",")}}"]
      )
      lt_data.each do |row|
        local_user_id = id_map[:users][row["user_id"].to_i]
        lt = LookoutTimelapse.new(
          user_id: local_user_id,
          session_token: row["session_token"],
          name: row["name"],
          duration: row["duration"]&.to_i,
          playback_url: row["playback_url"],
          thumbnail_url: row["thumbnail_url"],
          created_at: row["created_at"]
        )
        lt.save!(validate: false)
        id_map[:lookout_timelapses][row["id"].to_i] = lt.id
      end
    end

    # Pull LapseTimelapses
    unless recordable_ids["LapseTimelapse"].empty?
      puts "  Pulling #{recordable_ids["LapseTimelapse"].size} LapseTimelapses..."
      lapse_data = prod.exec_params(
        "SELECT id, user_id, lapse_timelapse_id, name, duration, playback_url, thumbnail_url, description, owner_handle, created_at
         FROM lapse_timelapses WHERE id = ANY($1)", ["{#{recordable_ids["LapseTimelapse"].join(",")}}"]
      )
      lapse_data.each do |row|
        local_user_id = id_map[:users][row["user_id"].to_i]
        lt = LapseTimelapse.new(
          user_id: local_user_id,
          lapse_timelapse_id: row["lapse_timelapse_id"],
          name: row["name"],
          duration: row["duration"]&.to_i,
          playback_url: row["playback_url"],
          thumbnail_url: row["thumbnail_url"],
          description: row["description"],
          owner_handle: row["owner_handle"],
          created_at: row["created_at"]
        )
        lt.save!(validate: false)
        id_map[:lapse_timelapses][row["id"].to_i] = lt.id
      end
    end

    # Pull YouTubeVideos
    unless recordable_ids["YouTubeVideo"].empty?
      puts "  Pulling #{recordable_ids["YouTubeVideo"].size} YouTubeVideos..."
      yt_data = prod.exec_params(
        "SELECT id, video_id, title, description, channel_id, channel_title, thumbnail_url, duration_seconds, published_at, was_live, created_at
         FROM you_tube_videos WHERE id = ANY($1)", ["{#{recordable_ids["YouTubeVideo"].join(",")}}"]
      )
      yt_data.each do |row|
        yt = YouTubeVideo.new(
          video_id: row["video_id"],
          title: row["title"],
          description: row["description"],
          channel_id: row["channel_id"],
          channel_title: row["channel_title"],
          thumbnail_url: row["thumbnail_url"],
          duration_seconds: row["duration_seconds"]&.to_i,
          published_at: row["published_at"],
          was_live: row["was_live"] == "t",
          created_at: row["created_at"]
        )
        yt.save!(validate: false)
        id_map[:you_tube_videos][row["id"].to_i] = yt.id
      end
    end

    # Create recordings linking journals to recordables
    created_recordings = 0
    rec_data.each do |row|
      local_je_id = id_map[:journal_entries][row["journal_entry_id"].to_i]
      local_user_id = id_map[:users][row["user_id"].to_i]
      next unless local_je_id && local_user_id

      type_map = {
        "LookoutTimelapse" => :lookout_timelapses,
        "LapseTimelapse" => :lapse_timelapses,
        "YouTubeVideo" => :you_tube_videos
      }
      local_recordable_id = id_map[type_map[row["recordable_type"]]][row["recordable_id"].to_i]
      next unless local_recordable_id

      r = Recording.new(
        recordable_type: row["recordable_type"],
        recordable_id: local_recordable_id,
        journal_entry_id: local_je_id,
        user_id: local_user_id,
        created_at: row["created_at"]
      )
      r.save!(validate: false)
      created_recordings += 1
    end
    puts "  Created #{created_recordings} recordings"

    puts "\n=== Creating ships ==="
    # Create one ship per project (design type)
    ship_count = 0
    id_map[:projects].each_value do |local_project_id|
      project = Project.find(local_project_id)
      next if project.journal_entries.count == 0

      ship = Ship.new(
        project: project,
        ship_type: :design,
        status: :pending,
        created_at: Time.current
      )
      ship.save!(validate: false)
      # create_initial_reviews! runs via after_create_commit
      ship_count += 1
      puts "  Ship ##{ship.id} for #{project.name} (#{project.journal_entries.count} entries)"
    end
    puts "Created #{ship_count} ships with review records."

    prod.close

    puts "\n=== Summary ==="
    puts "Users: #{User.count}"
    puts "Projects: #{Project.count}"
    puts "JournalEntries: #{JournalEntry.count}"
    puts "Recordings: #{Recording.count}"
    puts "Ships: #{Ship.count}"
    puts "TimeAuditReviews (pending): #{TimeAuditReview.pending.count}"
    puts "RequirementsCheckReviews (pending): #{RequirementsCheckReview.pending.count}"
  end
end
