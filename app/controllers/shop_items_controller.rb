class ShopItemsController < ApplicationController
  allow_trial_access only: %i[index show] # Shop is viewable by trial users

  def index
    @shop_items = policy_scope(ShopItem).order(price: :asc)

    render inertia: "shop/index", props: {
      shop_items: @shop_items.map { |item| serialize_shop_item(item) },
      koi_balance: current_user.koi,
      user_hours: (current_user.total_time_logged_seconds / 3600.0).floor,
      is_modal: request.headers["X-InertiaUI-Modal"].present?,
      user_id: current_user.id
    }
  end

  def show
    @shop_item = ShopItem.find(params[:id])
    authorize @shop_item

    render inertia: "shop/show", props: {
      shop_item: serialize_shop_item(@shop_item),
      can: {
        update: policy(@shop_item).update?,
        destroy: policy(@shop_item).destroy?
      },
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end

  private

  def serialize_shop_item(item)
    { id: item.id, name: item.name, description: item.description, price: item.price, image_url: item.image_url, status: item.status, featured: item.featured, ticket: item.ticket }
  end
end
