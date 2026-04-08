class CreateRequirementsCheckReviews < ActiveRecord::Migration[8.1]
  def change
    create_table :requirements_check_reviews do |t|
      t.references :ship, null: false, foreign_key: true, index: { unique: true }
      t.references :reviewer, foreign_key: { to_table: :users }
      t.integer :status, default: 0, null: false
      t.text :feedback
      t.text :internal_reason
      t.integer :lock_version, default: 0, null: false

      t.timestamps
    end

    add_index :requirements_check_reviews, :status
  end
end
