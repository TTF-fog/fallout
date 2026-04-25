require "test_helper"

class Admin::BulletinEventsControllerTest < ActionController::TestCase
  include ActiveSupport::Testing::TimeHelpers

  tests Admin::BulletinEventsController

  setup do
    @admin = users(:one)
    @admin.update!(onboarded: true)
    @request.session[:user_id] = @admin.id
  end

  test "manual running update preserves lifecycle when blank timestamps are submitted" do
    starts_at = Time.zone.local(2026, 4, 25, 10, 0, 0)
    event = create_event(schedulable: false, starts_at: starts_at, ends_at: nil)

    patch :update, params: {
      id: event.id,
      bulletin_event: old_manual_payload(event, image_url: "https://example.com/photo.png")
    }

    event.reload
    assert_redirected_to admin_bulletin_events_path
    assert_equal "https://example.com/photo.png", event.image_url
    assert_equal starts_at.to_i, event.starts_at.to_i
    assert_nil event.ends_at
    assert_equal :happening, event.status
  end

  test "manual expired update preserves lifecycle when blank timestamps are submitted" do
    starts_at = Time.zone.local(2026, 4, 25, 10, 0, 0)
    ends_at = Time.zone.local(2026, 4, 25, 11, 0, 0)
    event = create_event(schedulable: false, starts_at: starts_at, ends_at: ends_at)

    patch :update, params: {
      id: event.id,
      bulletin_event: old_manual_payload(event, image_url: "https://example.com/photo.png")
    }

    event.reload
    assert_redirected_to admin_bulletin_events_path
    assert_equal starts_at.to_i, event.starts_at.to_i
    assert_equal ends_at.to_i, event.ends_at.to_i
    assert_equal :expired, event.status
  end

  test "scheduled upcoming event becomes manual draft" do
    now = Time.zone.local(2026, 4, 25, 12, 0, 0)

    travel_to now do
      event = create_event(schedulable: true, starts_at: 1.day.from_now, ends_at: nil)

      patch :update, params: {
        id: event.id,
        bulletin_event: manual_mode_payload(event)
      }

      event.reload
      assert_redirected_to admin_bulletin_events_path
      assert_not event.schedulable?
      assert_nil event.starts_at
      assert_nil event.ends_at
      assert_equal :draft, event.status
    end
  end

  test "scheduled happening event becomes manual happening" do
    now = Time.zone.local(2026, 4, 25, 12, 0, 0)

    travel_to now do
      starts_at = 1.hour.ago
      event = create_event(schedulable: true, starts_at: starts_at, ends_at: 1.hour.from_now)

      patch :update, params: {
        id: event.id,
        bulletin_event: manual_mode_payload(event)
      }

      event.reload
      assert_redirected_to admin_bulletin_events_path
      assert_not event.schedulable?
      assert_equal starts_at.to_i, event.starts_at.to_i
      assert_nil event.ends_at
      assert_equal :happening, event.status
    end
  end

  test "scheduled expired event becomes manual expired" do
    now = Time.zone.local(2026, 4, 25, 12, 0, 0)

    travel_to now do
      starts_at = 2.hours.ago
      ends_at = 1.hour.ago
      event = create_event(schedulable: true, starts_at: starts_at, ends_at: ends_at)

      patch :update, params: {
        id: event.id,
        bulletin_event: manual_mode_payload(event)
      }

      event.reload
      assert_redirected_to admin_bulletin_events_path
      assert_not event.schedulable?
      assert_equal starts_at.to_i, event.starts_at.to_i
      assert_equal ends_at.to_i, event.ends_at.to_i
      assert_equal :expired, event.status
    end
  end

  test "manual draft cannot become scheduled without a start time" do
    event = create_event(schedulable: false, starts_at: nil, ends_at: nil)

    patch :update, params: {
      id: event.id,
      bulletin_event: {
        title: event.title,
        description: event.description,
        image_url: event.image_url,
        schedulable: true,
        starts_at: nil,
        ends_at: nil
      }
    }

    event.reload
    assert_redirected_to admin_bulletin_events_path
    assert_not event.schedulable?
    assert_nil event.starts_at
    assert_nil event.ends_at
  end

  private

  def create_event(**attrs)
    BulletinEvent.create!({
      title: "Bulletin event",
      description: "Details",
      image_url: nil
    }.merge(attrs))
  end

  def old_manual_payload(event, image_url:)
    {
      title: event.title,
      description: event.description,
      image_url: image_url,
      schedulable: false,
      starts_at: nil,
      ends_at: nil
    }
  end

  def manual_mode_payload(event)
    old_manual_payload(event, image_url: event.image_url)
  end
end
