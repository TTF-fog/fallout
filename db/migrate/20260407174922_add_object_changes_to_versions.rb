class AddObjectChangesToVersions < ActiveRecord::Migration[8.1]
  def change
    add_column :versions, :object_changes, :jsonb
    add_index :versions, :object_changes, using: :gin
  end
end
