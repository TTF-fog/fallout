declare module '@inertiaui/modal-react' {
  import type { ComponentType, ReactNode } from 'react'
  export function renderApp(App: ComponentType<any>, props: any): ReactNode
  export function ModalLink(props: {
    href: string
    navigate?: boolean
    children?: ReactNode
    [key: string]: any
  }): JSX.Element
  export function Modal(props: {
    children?: ReactNode
    panelClasses?: string
    paddingClasses?: string
    maxWidth?: string
    duration?: number
    [key: string]: any
  }): JSX.Element
  export function useModal(): { isOpen: boolean; close: () => void }
}
