class CreateProjectKudos < ActiveRecord::Migration[8.1]
  def change
    create_table :project_kudos do |t|
      t.references :project, null: false, foreign_key: true
      t.references :sender, null: false, foreign_key: { to_table: :users }
      t.references :recipient, null: false, foreign_key: { to_table: :users }
      t.text :text, null: false
      t.integer :status, null: false, default: 0
      t.datetime :approved_at

      t.timestamps
    end

    add_index :project_kudos, :status
  end
end
