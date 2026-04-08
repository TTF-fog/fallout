class AddAdjustmentsToPhase2Reviews < ActiveRecord::Migration[8.1]
  def change
    add_column :design_reviews, :hours_adjustment, :integer
    add_column :design_reviews, :koi_adjustment, :integer
    add_column :build_reviews, :hours_adjustment, :integer
    add_column :build_reviews, :koi_adjustment, :integer
  end
end
