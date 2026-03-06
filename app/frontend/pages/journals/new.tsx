import { useState, type ReactNode } from 'react'
import { Modal } from '@inertiaui/modal-react'
import Frame from '@/components/shared/Frame'

type Project = { id: number; name: string }

function NewJournal({ projects, selected_project_id, lapse_connected, is_modal }: {
  projects: Project[]
  selected_project_id: number | null
  lapse_connected: boolean
  is_modal: boolean
}) {
  const initialProject = selected_project_id
    ? projects.find((p) => p.id === selected_project_id) ?? null
    : projects.length === 1 ? projects[0] : null

  const [selectedProject, setSelectedProject] = useState<Project | null>(initialProject)

  const content = selectedProject ? (
    <div className="w-full h-full mx-auto p-8">
      <h1 className="font-bold text-3xl mb-4">New Journal</h1>
      <p className="text-lg">Journaling for: <span className="font-bold">{selectedProject.name}</span></p>
      {!lapse_connected && (
        <div className="mt-6 p-4 border border-amber-300 bg-amber-50 rounded-lg">
          <p className="text-lg font-bold mb-2">Connect Lapse</p>
          <p className="mb-3">You need to connect Lapse to record timelapses for your journal.</p>
          <a href={`/auth/lapse/start?return_to=journal&project_id=${selectedProject.id}`} className="inline-block px-4 py-2 bg-dark-brown text-white rounded font-bold hover:opacity-90">
            Connect Lapse
          </a>
        </div>
      )}
    </div>
  ) : (
    <div className="w-full h-full mx-auto p-8">
      <h1 className="font-bold text-3xl mb-4">Which project?</h1>
      <p className="text-lg mb-6">Select the project you want to journal for:</p>
      <div className="flex flex-col gap-3">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setSelectedProject(project)}
            className="text-lg font-bold text-dark-brown hover:underline text-left cursor-pointer"
          >
            {project.name}
          </button>
        ))}
      </div>
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

NewJournal.layout = (page: ReactNode) => page

export default NewJournal
