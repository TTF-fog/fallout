namespace :lookout do
  desc "Backfill Lookout timelapse playback_url and thumbnail_url with resolved URLs from the API"
  task backfill_urls: :environment do
    total = LookoutTimelapse.count
    updated = 0
    failed = 0

    LookoutTimelapse.find_each.with_index do |lt, i|
      print "\r[#{i + 1}/#{total}] Refreshing #{lt.name || lt.session_token.first(8)}..."

      lt.refetch_data!
      updated += 1
    rescue => e
      failed += 1
      puts "\n  Failed LookoutTimelapse ##{lt.id}: #{e.message}"
    end

    puts "\nDone. Updated: #{updated}, Failed: #{failed}"
  end
end
