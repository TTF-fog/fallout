class MarkdownController < ApplicationController
  allow_unauthenticated_access only: %i[show raw toc] # Public documentation
  allow_trial_access only: %i[show raw toc] # Trial users can read docs
  skip_after_action :verify_authorized # No authorizable resource on any action
  skip_after_action :verify_policy_scoped # No index action; no policy-scoped queries

  def show
    slug = params[:slug].to_s
    slug = "index" if slug.blank?
    not_found unless valid_slug?(slug)

    path = resolve_doc_path(slug)
    not_found unless path

    content_html = helpers.render_markdown_file(path)
    meta = helpers.docs_meta_for_url("/docs#{slug == 'index' ? '' : "/#{slug}"}")
    page_title = meta&.dig(:title).presence || slug.tr("-_/", " ").split.map(&:capitalize).join(" ")

    index_meta = helpers.docs_meta_for_url("/docs")
    index_title = index_meta&.dig(:title).presence || "Overview"

    render inertia: {
      content_html: content_html,
      page_title: page_title,
      menu_items: helpers.docs_grouped_menu_items,
      index_title: index_title
    }
  end

  def raw
    slug = params[:slug].to_s
    slug = "index" if slug.blank?
    not_found unless valid_slug?(slug)

    path = resolve_doc_path(slug)
    not_found unless path

    render plain: helpers.raw_doc_content(path), content_type: "text/markdown; charset=utf-8"
  end

  def toc
    render plain: helpers.docs_toc_markdown, content_type: "text/markdown; charset=utf-8"
  end

  private

  def resolve_doc_path(slug)
    base = Rails.root.join("docs")
    candidates = if slug == "index"
      [ base.join("index.md"), base.join("index.mdx") ]
    else
      [ base.join("#{slug}.md"), base.join("#{slug}.mdx"), base.join(slug, "index.md"), base.join(slug, "index.mdx") ]
    end

    path = candidates.find { |p| File.exist?(p.to_s) }
    return nil unless path
    return nil unless File.expand_path(path).start_with?(File.expand_path(base))

    path
  end

  def valid_slug?(slug)
    return true if slug == "index"
    return false if slug.include?("..") || slug.start_with?("/")

    slug.match?(%r{\A[a-z0-9_\-/]+\z})
  end

  def not_found
    raise ActionController::RoutingError, "Not Found"
  end
end
