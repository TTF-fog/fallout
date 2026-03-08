# == Schema Information
#
# Table name: mail_messages
#
#  id          :bigint           not null, primary key
#  action_url  :string
#  content     :text
#  dismissable :boolean          default(TRUE), not null
#  expires_at  :datetime
#  filters     :jsonb            not null
#  pinned      :boolean          default(FALSE), not null
#  source_type :string
#  summary     :string           not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  author_id   :bigint
#  source_id   :bigint
#  user_id     :bigint
#
# Indexes
#
#  index_mail_messages_on_expires_at                 (expires_at)
#  index_mail_messages_on_filters                    (filters) USING gin
#  index_mail_messages_on_source_type_and_source_id  (source_type,source_id)
#  index_mail_messages_on_user_id                    (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (author_id => users.id)
#  fk_rails_...  (user_id => users.id)
#
class MailMessage < ApplicationRecord
  has_paper_trail

  belongs_to :user, optional: true
  belongs_to :author, class_name: "User", optional: true
  belongs_to :source, polymorphic: true, optional: true

  has_many :mail_interactions, dependent: :destroy

  validates :summary, presence: true

  scope :not_expired, -> { where("mail_messages.expires_at IS NULL OR mail_messages.expires_at > ?", Time.current) }
  scope :pinned, -> { where(pinned: true) }

  scope :visible_to, ->(user) {
    not_expired
      .where(build_visibility_condition(user))
      .where.not(id: user.mail_interactions.dismissed.select(:mail_message_id))
  }

  def self.build_visibility_condition(user)
    direct = arel_table[:user_id].eq(user.id)

    broadcast = arel_table[:user_id].eq(nil).and(
      Arel::Nodes::SqlLiteral.new("mail_messages.filters = '{}'::jsonb")
    )

    filtered = arel_table[:user_id].eq(nil).and(
      Arel::Nodes::SqlLiteral.new("mail_messages.filters != '{}'::jsonb")
    ).and(build_filter_conditions(user))

    direct.or(broadcast).or(filtered)
  end

  def self.build_filter_conditions(user)
    conditions = []

    # Role filter: user has any of the specified roles
    if user.roles.present?
      quoted_roles = user.roles.map { |r| ActiveRecord::Base.connection.quote(r) }.join(",")
      conditions << "(mail_messages.filters->'roles' IS NULL OR mail_messages.filters->'roles' ?| ARRAY[#{quoted_roles}])"
    else
      conditions << "mail_messages.filters->'roles' IS NULL"
    end

    # Join date filters
    user_date = user.created_at.to_date.iso8601
    conditions << "(mail_messages.filters->>'joined_before' IS NULL OR #{connection.quote(user_date)} < (mail_messages.filters->>'joined_before')::date)"
    conditions << "(mail_messages.filters->>'joined_after' IS NULL OR #{connection.quote(user_date)} >= (mail_messages.filters->>'joined_after')::date)"

    # Activity filters — pre-evaluated in Ruby
    has_projects = user.projects.kept.exists?
    conditions << "(mail_messages.filters->>'has_projects' IS NULL OR #{has_projects})"

    ship_statuses = user.ships.distinct.pluck(:status)
    conditions << "(mail_messages.filters->>'has_ships_with_status' IS NULL OR mail_messages.filters->>'has_ships_with_status' IN (#{ship_statuses.map { |s| connection.quote(s) }.join(",").presence || "''"}))"

    # Explicit user ID list
    conditions << "(mail_messages.filters->'user_ids' IS NULL OR mail_messages.filters->'user_ids' @> #{connection.quote(user.id.to_s)}::jsonb)"

    Arel::Nodes::SqlLiteral.new(conditions.join(" AND "))
  end
end
