class AddNameToCollapseTimelapses < ActiveRecord::Migration[8.1]
  def change
    add_column :collapse_timelapses, :name, :string unless column_exists?(:collapse_timelapses, :name)
  end
end
