class AddShipTypeToShips < ActiveRecord::Migration[8.1]
  def change
    add_column :ships, :ship_type, :integer, default: 0, null: false
    add_index :ships, :ship_type
  end
end
