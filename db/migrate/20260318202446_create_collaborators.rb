class CreateCollaborators < ActiveRecord::Migration[8.1]
  def change
    create_table :collaborators do |t|
      t.references :user, null: false, foreign_key: true
      t.references :collaboratable, polymorphic: true, null: false

      t.timestamps
    end

    add_index :collaborators, [ :user_id, :collaboratable_type, :collaboratable_id ],
      unique: true, name: "index_collaborators_uniqueness"
  end
end
