desc "Backfill object_changes for existing PaperTrail versions"
task backfill_object_changes: :environment do
  PERMITTED_CLASSES = [
    Time, Date, DateTime, ActiveSupport::TimeWithZone, ActiveSupport::TimeZone,
    BigDecimal, Symbol
  ].freeze

  def deserialize_object(yaml_string)
    YAML.safe_load(yaml_string, permitted_classes: PERMITTED_CLASSES, aliases: true)
  rescue Psych::DisallowedClass, Psych::BadAlias => e
    puts "  Warning: could not deserialize version: #{e.message}"
    nil
  end

  versions = PaperTrail::Version.where(event: "update", object_changes: nil).where.not(object: nil)
  total = versions.count
  puts "Backfilling #{total} versions..."

  # Group by item so we can diff consecutive versions
  all_versions = PaperTrail::Version
    .where(item_type: versions.select(:item_type).distinct)
    .order(:item_type, :item_id, :created_at)
    .group_by { |v| [ v.item_type, v.item_id ] }

  updated = 0
  all_versions.each do |(item_type, item_id), item_versions|
    record = item_type.constantize.find_by(id: item_id)

    item_versions.each_with_index do |version, i|
      next unless version.event == "update" && version.object_changes.nil? && version.object.present?

      prev_attrs = deserialize_object(version.object)
      next unless prev_attrs

      next_version = item_versions[i + 1]
      after_attrs = if next_version&.object.present?
        deserialize_object(next_version.object)
      elsif record
        record.attributes
      end
      next unless after_attrs

      changes = {}
      prev_attrs.each do |key, prev_val|
        next unless after_attrs.key?(key)
        next_val = after_attrs[key]
        next if prev_val == next_val

        changes[key] = [ prev_val, next_val ]
      end

      if changes.present?
        version.update_column(:object_changes, changes)
        updated += 1
      end
    end
  end

  puts "Done. Backfilled #{updated} versions."
end
