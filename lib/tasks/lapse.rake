namespace :lapse do
  desc "Backfill LapseTimelapse durations with actual video duration (via ffprobe)"
  task backfill_video_durations: :environment do
    total = LapseTimelapse.count
    updated = 0
    skipped = 0
    failed = 0

    LapseTimelapse.find_each.with_index do |lt, i|
      print "\r[#{i + 1}/#{total}] #{lt.name || lt.lapse_timelapse_id}..."

      unless lt.playback_url.present?
        skipped += 1
        next
      end

      output = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 #{Shellwords.escape(lt.playback_url)} 2>&1`.strip
      video_duration = output.to_f

      if video_duration > 0
        real_duration = video_duration * 60 # 1 video second = 1 real minute
        old_duration = lt.duration
        lt.update!(duration: real_duration)
        updated += 1
        puts "\n  #{lt.name}: #{old_duration}s → #{real_duration}s (video: #{video_duration.round(1)}s)"
      else
        failed += 1
        puts "\n  Failed #{lt.name}: ffprobe returned '#{output}'"
      end
    rescue => e
      failed += 1
      puts "\n  Failed LapseTimelapse ##{lt.id}: #{e.message}"
    end

    puts "\nDone. Updated: #{updated}, Skipped: #{skipped}, Failed: #{failed}"
  end
end
