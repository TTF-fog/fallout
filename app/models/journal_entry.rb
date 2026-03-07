class JournalEntry < ApplicationRecord
  include Discardable

  has_paper_trail

  belongs_to :user
  belongs_to :project
  has_many :lapse_timelapses, dependent: :nullify
end
