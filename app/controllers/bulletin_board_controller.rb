class BulletinBoardController < ApplicationController
  include BulletinEventSerializer

  EXPLORE_SOURCES = %w[journals projects].freeze
  EXPLORE_SORTS = %w[newest top].freeze

  allow_trial_access only: %i[index search event] # Public community hub, trial users welcome
  skip_after_action :verify_authorized, only: %i[index search event] # No authorizable resource (event detail is public)
  skip_after_action :verify_policy_scoped, only: %i[index search event] # No scoped collection yet

  def index
    render inertia: "bulletin_board/index", props: {
      events: real_events,
      featured: placeholder_featured,
      explore: placeholder_explore,
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end

  def search
    render json: { explore: explore_entries }
  end

  def event
    @event = BulletinEvent.find(params[:id])
    render inertia: "bulletin_board/events/show", props: {
      event: serialize_bulletin_event(@event),
      is_modal: request.headers["X-InertiaUI-Modal"].present?
    }
  end

  private

  def real_events
    BulletinEvent.order(Arel.sql("COALESCE(starts_at, '9999-01-01') ASC")).map { |e| serialize_bulletin_event(e) }
  end

  def placeholder_featured
    [
      { image: "https://cdn.hackclub.com/019da253-bf73-7076-84c4-14ca42fe4781/jesuskeyboard.webp", title: "The biblically accurate keyboard", username: "Alex Tran" },
      { image: "https://cdn.hackclub.com/019da254-32dd-7eff-a250-15f538271cc1/minimaimai.webp", title: "Mini Maimai", username: "Tongyu" },
      { image: "https://cdn.hackclub.com/019da254-2ec5-719c-bd5e-b31f9a6a8be8/icepizero.webp", title: "Icepi Zero", username: "Cyao" },
      { image: "https://cdn.hackclub.com/019da254-3669-72bc-baf5-c0d7a0f5da52/splitwave.webp", title: "Split Wave", username: "Antush" }
    ]
  end

  def placeholder_explore
    explore_entries(source: "journals", sort: "newest")
  end

  def explore_entries(source: normalized_explore_source, sort: normalized_explore_sort)
    entries = fake_explore_entries.fetch(source)
    sorted = case sort
    when "top"
      entries.sort_by { |entry| [ entry[:likes], entry[:comments], entry[:occurred_at] ] }.reverse
    else
      entries.sort_by { |entry| entry[:occurred_at] }.reverse
    end

    sorted.map { |entry| entry.except(:occurred_at) }
  end

  def normalized_explore_source
    source = params[:source].to_s
    EXPLORE_SOURCES.include?(source) ? source : "journals"
  end

  def normalized_explore_sort
    sort = params[:sort].to_s
    EXPLORE_SORTS.include?(sort) ? sort : "newest"
  end

  def fake_explore_entries
    {
      "journals" => [
        {
          username: "Alex Tran",
          date: "April 3, 2026",
          occurred_at: "2026-04-03T16:10:00Z",
          project_name: "Biblical Keyboard",
          image: "https://picsum.photos/seed/fallout-journal-biblical-keyboard/800/500",
          content: "Shipped the first prototype - all 72 keys wired and responsive.",
          description: "A keyboard with biblically accurate layouts and angelic key travel.",
          tags: [ "hardware", "keyboard", "retro" ],
          likes: 42,
          comments: 7
        },
        {
          username: "Tongyu",
          date: "April 2, 2026",
          occurred_at: "2026-04-02T21:35:00Z",
          project_name: "Mini Maimai",
          image: "https://picsum.photos/seed/fallout-journal-mini-maimai/800/500",
          content: "Drum pads now register hits within 5ms. Rhythm game feels real.",
          description: "A portable Maimai-style rhythm game console.",
          tags: [ "gamedev", "hardware" ],
          likes: 28,
          comments: 3
        },
        {
          username: "Cyao",
          date: "April 1, 2026",
          occurred_at: "2026-04-01T18:25:00Z",
          project_name: "Icepi Zero",
          image: "https://picsum.photos/seed/fallout-journal-icepi-zero/800/500",
          content: "Got the custom PCB back from fab. All traces check out.",
          description: "A Raspberry Pi Zero form-factor board with integrated display.",
          tags: [ "hardware", "pcb" ],
          likes: 35,
          comments: 5
        },
        {
          username: "Antush",
          date: "March 30, 2026",
          occurred_at: "2026-03-30T13:20:00Z",
          project_name: "Split Wave",
          image: "https://picsum.photos/seed/fallout-journal-split-wave/800/500",
          content: "First sound test - split keyboard now produces chords.",
          description: "An ergonomic split keyboard that doubles as a MIDI controller.",
          tags: [ "keyboard", "music" ],
          likes: 19,
          comments: 2
        },
        {
          username: "Maya Chen",
          date: "March 29, 2026",
          occurred_at: "2026-03-29T23:00:00Z",
          project_name: "Pocket Weather Lab",
          image: "https://picsum.photos/seed/fallout-journal-pocket-weather-lab/800/500",
          content: "Calibrated the barometer against three stations and fixed the enclosure venting.",
          description: "A tiny field station for logging pressure, humidity, and temperature.",
          tags: [ "sensors", "enclosure", "weather" ],
          likes: 51,
          comments: 9
        },
        {
          username: "Noor Patel",
          date: "March 27, 2026",
          occurred_at: "2026-03-27T15:45:00Z",
          project_name: "SolderScope",
          image: "https://picsum.photos/seed/fallout-journal-solderscope/800/500",
          content: "The focus rail finally moves smoothly after swapping to brass inserts.",
          description: "A low-cost inspection microscope with a printed frame and LED ring.",
          tags: [ "tools", "3d-printing", "optics" ],
          likes: 24,
          comments: 6
        }
      ],
      "projects" => [
        {
          username: "Priya Rao",
          date: "April 4, 2026",
          occurred_at: "2026-04-04T10:15:00Z",
          project_name: "Garden Ghost",
          image: "https://picsum.photos/seed/fallout-project-garden-ghost/800/500",
          content: "A solar soil monitor that nudges you before your plants get dramatic.",
          description: "Combines capacitive moisture sensing, e-ink status, and a tiny weatherproof enclosure.",
          tags: [ "solar", "sensors", "garden" ],
          likes: 33,
          comments: 4
        },
        {
          username: "Samir Lee",
          date: "April 3, 2026",
          occurred_at: "2026-04-03T08:45:00Z",
          project_name: "Bench Buddy",
          image: "https://picsum.photos/seed/fallout-project-bench-buddy/800/500",
          content: "A desktop power supply assistant with current graphs and preset rails.",
          description: "Built around a custom PCB, rotary controls, and a small color display.",
          tags: [ "lab", "pcb", "power" ],
          likes: 57,
          comments: 11
        },
        {
          username: "Lina Park",
          date: "April 1, 2026",
          occurred_at: "2026-04-01T17:05:00Z",
          project_name: "Quiet Badge",
          image: "https://picsum.photos/seed/fallout-project-quiet-badge/800/500",
          content: "An event badge that shows availability without blasting notifications.",
          description: "Uses addressable LEDs, a low-power MCU, and simple tap gestures.",
          tags: [ "wearable", "leds", "events" ],
          likes: 46,
          comments: 8
        },
        {
          username: "Diego Flores",
          date: "March 31, 2026",
          occurred_at: "2026-03-31T20:25:00Z",
          project_name: "Transit Ticker",
          image: "https://picsum.photos/seed/fallout-project-transit-ticker/800/500",
          content: "A split-flap style desk display for buses, trains, and build timers.",
          description: "The mechanism uses printed flaps, hall sensors, and a quiet stepper driver.",
          tags: [ "mechanical", "display", "transit" ],
          likes: 61,
          comments: 10
        },
        {
          username: "Ari Kim",
          date: "March 28, 2026",
          occurred_at: "2026-03-28T12:00:00Z",
          project_name: "Macro Loom",
          image: "https://picsum.photos/seed/fallout-project-macro-loom/800/500",
          content: "A modular macro pad system with magnetic tiles and per-key OLED labels.",
          description: "Each tile handles a different workflow and snaps onto a shared USB-C base.",
          tags: [ "keyboard", "modular", "oled" ],
          likes: 39,
          comments: 5
        },
        {
          username: "Eva Miller",
          date: "March 26, 2026",
          occurred_at: "2026-03-26T19:40:00Z",
          project_name: "Wave Lantern",
          image: "https://picsum.photos/seed/fallout-project-wave-lantern/800/500",
          content: "A desk lamp that visualizes nearby audio with soft diffused light.",
          description: "The build pairs a microphone front-end with layered acrylic and warm LEDs.",
          tags: [ "audio", "lighting", "acrylic" ],
          likes: 29,
          comments: 7
        }
      ]
    }
  end
end
