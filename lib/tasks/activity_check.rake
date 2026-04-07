# frozen_string_literal: true

namespace :activity_check do
  desc "Enqueue TimelapseActivityCheckJob for all recordings not yet checked"
  task backfill: :environment do
    [LookoutTimelapse, LapseTimelapse, YouTubeVideo].each do |klass|
      unchecked = klass.where(activity_checked_at: nil)
      count = unchecked.count
      puts "#{klass.name}: #{count} unchecked"

      unchecked.find_each do |record|
        TimelapseActivityCheckJob.perform_later(record)
      end

      puts "  Enqueued #{count} jobs"
    end

    puts "Done — jobs will process on the heavy queue"
  end
end
