class AddFieldsToShopItems < ActiveRecord::Migration[8.1]
  # No-op: columns (price, note, image_url) already exist from CreateShopItems migration.
  # Kept to preserve migration history for existing deployments.
  def change
  end
end
