class CreateMailInteractions < ActiveRecord::Migration[8.1]
  def change
    create_table :mail_interactions do |t|
      t.references :mail_message, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.datetime :read_at
      t.datetime :dismissed_at

      t.timestamps
    end

    add_index :mail_interactions, [ :user_id, :mail_message_id ], unique: true
  end
end
