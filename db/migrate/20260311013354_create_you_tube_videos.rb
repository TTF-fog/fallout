class CreateYouTubeVideos < ActiveRecord::Migration[8.1]
  def change
    create_table :you_tube_videos do |t|
      t.string :video_id, null: false
      t.string :title
      t.text :description
      t.string :channel_id
      t.string :channel_title
      t.string :thumbnail_url
      t.integer :duration_seconds
      t.datetime :published_at
      t.string :definition
      t.boolean :caption
      t.string :live_broadcast_content
      t.text :tags
      t.string :category_id
      t.references :user, foreign_key: true
      t.references :journal_entry, foreign_key: true

      t.timestamps
    end
    add_index :you_tube_videos, :video_id, unique: true
  end
end
