class CreateLapseTimelapses < ActiveRecord::Migration[8.1]
  def change
    create_table :lapse_timelapses do |t|
      t.references :user, null: false, foreign_key: true
      t.references :journal, null: true, foreign_key: true
      t.string :lapse_timelapse_id, null: false
      t.string :name
      t.text :description
      t.string :visibility
      t.boolean :is_published
      t.string :playback_url
      t.string :thumbnail_url
      t.string :video_container_kind
      t.float :duration
      t.datetime :lapse_created_at
      t.string :owner_lapse_id
      t.string :owner_handle
      t.datetime :last_refreshed_at

      t.timestamps
    end

    add_index :lapse_timelapses, :lapse_timelapse_id, unique: true
  end
end
