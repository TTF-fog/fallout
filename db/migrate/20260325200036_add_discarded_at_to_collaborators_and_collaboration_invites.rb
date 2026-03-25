class AddDiscardedAtToCollaboratorsAndCollaborationInvites < ActiveRecord::Migration[8.1]
  def change
    add_column :collaborators, :discarded_at, :datetime
    add_column :collaboration_invites, :discarded_at, :datetime
    add_index :collaborators, :discarded_at
    add_index :collaboration_invites, :discarded_at
  end
end
