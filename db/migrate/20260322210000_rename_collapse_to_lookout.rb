class RenameCollapseToLookout < ActiveRecord::Migration[8.1]
  def up
    rename_table :collapse_timelapses, :lookout_timelapses
    rename_column :users, :pending_collapse_tokens, :pending_lookout_tokens
    # Update polymorphic type references for delegated_type
    Recording.where(recordable_type: "CollapseTimelapse").update_all(recordable_type: "LookoutTimelapse")
  end

  def down
    rename_table :lookout_timelapses, :collapse_timelapses
    rename_column :users, :pending_lookout_tokens, :pending_collapse_tokens
    Recording.where(recordable_type: "LookoutTimelapse").update_all(recordable_type: "CollapseTimelapse")
  end
end
