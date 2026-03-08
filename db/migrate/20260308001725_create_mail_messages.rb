class CreateMailMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :mail_messages do |t|
      t.string :summary, null: false
      t.text :content
      t.boolean :pinned, default: false, null: false
      t.boolean :dismissable, default: true, null: false
      t.string :action_url
      t.datetime :expires_at
      t.string :source_type
      t.bigint :source_id
      t.jsonb :filters, default: {}, null: false
      t.bigint :user_id
      t.bigint :author_id

      t.timestamps
    end

    add_foreign_key :mail_messages, :users, column: :user_id
    add_foreign_key :mail_messages, :users, column: :author_id
    add_index :mail_messages, :user_id
    add_index :mail_messages, [ :source_type, :source_id ]
    add_index :mail_messages, :expires_at
    add_index :mail_messages, :filters, using: :gin, opclass: :jsonb_path_ops
  end
end
