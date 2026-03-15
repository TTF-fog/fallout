import { router, Link } from '@inertiajs/react'
import { Modal } from '@inertiaui/modal-react'
import Frame from '@/components/shared/Frame'
import { notify } from '@/lib/notifications'
import type { ProjectDetail, JournalEntryCard } from '@/types'

function isSafeUrl(url: string | null): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export default function ProjectsShow({
  project,
  journal_entries,
  can,
  is_modal,
}: {
  project: ProjectDetail
  journal_entries: JournalEntryCard[]
  can: { update: boolean; destroy: boolean }
  is_modal?: boolean
}) {
  function deleteProject() {
    if (confirm('Are you sure?')) {
      router.delete(`/projects/${project.id}`, {
        onError: () => notify('alert', 'Failed to delete project. Please try again.'),
      })
    }
  }

  const content = (
    <div className="w-full mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-4xl">{project.name}</h1>
        <div className="flex gap-2">
          {can.update && (
            <Link href={`/projects/${project.id}/edit`} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
              Edit
            </Link>
          )}
          {can.destroy && (
            <button onClick={deleteProject} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Delete
            </button>
          )}
        </div>
      </div>

      {project.is_unlisted && (
        <span className="inline-block bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded mb-4">Unlisted</span>
      )}

      {project.description && <p className="text-gray-700 mb-4">{project.description}</p>}

      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags.map((tag) => (
            <span key={tag} className="bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-4 text-sm text-gray-500 mb-6">
        {isSafeUrl(project.demo_link) && (
          <a href={project.demo_link!} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
            Demo
          </a>
        )}
        {isSafeUrl(project.repo_link) && (
          <a href={project.repo_link!} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
            Repository
          </a>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Created by {project.user_display_name} on {project.created_at}
      </p>

      {journal_entries.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-2xl mb-4">Journal Entries</h2>
          <div className="space-y-6">
            {journal_entries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-5">
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: entry.content_html }} />

                {entry.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {entry.images.map((src, i) => (
                      <img key={i} src={src} alt="" className="rounded h-32 object-cover" />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-4 text-sm text-gray-500">
                  <span>{entry.created_at}</span>
                  {entry.recordings_count > 0 && (
                    <span>
                      {entry.recordings_count} recording{entry.recordings_count !== 1 && 's'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (is_modal) {
    return (
      <Modal panelClasses="h-full" paddingClasses="max-w-5xl mx-auto" closeButton={false} maxWidth="7xl">
        <Frame className="h-full">{content}</Frame>
      </Modal>
    )
  }

  return content
}
