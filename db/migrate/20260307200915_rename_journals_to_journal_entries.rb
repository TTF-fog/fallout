class RenameJournalsToJournalEntries < ActiveRecord::Migration[8.1]
  def change
    rename_table :journals, :journal_entries
    rename_column :lapse_timelapses, :journal_id, :journal_entry_id
  end
end
