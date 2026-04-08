class AddActivityCheckToLapseAndYoutube < ActiveRecord::Migration[8.1]
  def change
    change_table :lapse_timelapses, bulk: true do |t|
      t.datetime :activity_checked_at
      t.integer :inactive_frame_count
      t.float :inactive_percentage
      t.jsonb :inactive_segments, default: []
    end

    change_table :you_tube_videos, bulk: true do |t|
      t.datetime :activity_checked_at
      t.integer :inactive_frame_count
      t.float :inactive_percentage
      t.jsonb :inactive_segments, default: []
    end
  end
end
