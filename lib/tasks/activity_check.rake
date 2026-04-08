# frozen_string_literal: true

namespace :activity_check do
  desc "Enqueue TimelapseActivityCheckJob for all recordings not yet checked"
  task backfill: :environment do
    enqueue_jobs(scope: ->(klass) { klass.where(activity_checked_at: nil) })
  end

  desc "Re-run TimelapseActivityCheckJob for ALL recordings (including previously checked)"
  task rerun_all: :environment do
    enqueue_jobs(scope: ->(klass) { klass.all })
  end

  def enqueue_jobs(scope:)
    [LookoutTimelapse, LapseTimelapse, YouTubeVideo].each do |klass|
      records = scope.call(klass)
      count = records.count
      puts "#{klass.name}: #{count} to process"

      records.find_each do |record|
        TimelapseActivityCheckJob.perform_later(record)
      end

      puts "  Enqueued #{count} jobs"
    end

    puts "Done — jobs will process on the heavy queue"
  end
end
