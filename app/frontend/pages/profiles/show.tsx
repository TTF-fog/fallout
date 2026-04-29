import { type ReactNode, useState, useRef } from 'react'
import { router } from '@inertiajs/react'
import { Modal } from '@inertiaui/modal-react'
import { DirectUpload } from '@rails/activestorage'
import Axios from 'axios'
import Frame from '@/components/shared/Frame'
import ProgressBar from '@/components/shared/ProgressBar'
import { notify } from '@/lib/notifications'

type Tab = 'body' | 'bg' | 'eyes' | 'hats' | 'mouth' | 'tie' | 'ears' | 'cheeks'

type PageProps = {
  display_name: string
  avatar: string
  current_streak: number
  total_hours: number
  body_images: string[]
  bg_images: string[]
  eye_images: string[]
  hat_images: string[]
  mouth_images: string[]
  tie_images: string[]
  ear_images: string[]
  cheek_images: string[]
  direct_upload_url: string
  has_slack_token: boolean
  is_modal: boolean
}

const HOURS_GOAL = 60

const TABS: { key: Tab; label: string }[] = [
  { key: 'bg', label: 'Scene' },
  { key: 'body', label: 'Base' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'hats', label: 'Hats' },
  { key: 'mouth', label: 'Mouth' },
  { key: 'tie', label: 'Tie' },
  { key: 'ears', label: 'Ears' },
  { key: 'cheeks', label: 'Cheeks' },
]

function modalHeaders() {
  return {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
    'X-InertiaUI-Modal': crypto.randomUUID(),
    'X-InertiaUI-Modal-Use-Router': 0,
  }
}

function ProfileShow({
  display_name,
  avatar,
  current_streak,
  total_hours,
  body_images,
  bg_images,
  eye_images,
  hat_images,
  mouth_images,
  tie_images,
  ear_images,
  cheek_images,
  direct_upload_url,
  has_slack_token,
  is_modal,
}: PageProps) {
  const [currentAvatar, setCurrentAvatar] = useState(avatar)
  const [selectedBody, setSelectedBody] = useState<string | null>(body_images[0] ?? null)
  const [selectedBg, setSelectedBg] = useState<string | null>(bg_images[0] ?? null)
  const [selectedEye, setSelectedEye] = useState<string | null>(eye_images[0] ?? null)
  const [selectedHat, setSelectedHat] = useState<string | null>(hat_images[0] ?? null)
  const [selectedMouth, setSelectedMouth] = useState<string | null>(mouth_images[0] ?? null)
  const [selectedTie, setSelectedTie] = useState<string | null>(tie_images[0] ?? null)
  const [selectedEar, setSelectedEar] = useState<string | null>(ear_images[0] ?? null)
  const [selectedCheek, setSelectedCheek] = useState<string | null>(cheek_images[0] ?? null)
  const [activeTab, setActiveTab] = useState<Tab>('body')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingSlack, setSettingSlack] = useState(false)
  const [randomizing, setRandomizing] = useState(false)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hoursProgress = Math.min((total_hours / HOURS_GOAL) * 100, 100)
  const hoursDisplay = Math.min(total_hours, HOURS_GOAL)

  const imagesByTab: Record<Tab, string[]> = {
    body: body_images,
    bg: bg_images,
    eyes: eye_images,
    hats: hat_images,
    mouth: mouth_images,
    tie: tie_images,
    ears: ear_images,
    cheeks: cheek_images,
  }

  const selectedByTab: Record<Tab, string | null> = {
    body: selectedBody,
    bg: selectedBg,
    eyes: selectedEye,
    hats: selectedHat,
    mouth: selectedMouth,
    tie: selectedTie,
    ears: selectedEar,
    cheeks: selectedCheek,
  }

  const settersByTab: Record<Tab, (v: string | null) => void> = {
    body: setSelectedBody,
    bg: setSelectedBg,
    eyes: setSelectedEye,
    hats: setSelectedHat,
    mouth: setSelectedMouth,
    tie: setSelectedTie,
    ears: setSelectedEar,
    cheeks: setSelectedCheek,
  }

  const imageClassByTab: Record<Tab, string> = {
    body: 'w-full h-full object-cover',
    bg: 'w-full h-full object-cover',
    eyes: 'w-full h-full object-cover scale-170 -translate-y-3',
    hats: 'w-full h-full object-cover scale-140 translate-y-8',
    mouth: 'w-full h-full object-cover scale-240 -translate-y-7',
    tie: 'w-full h-full object-cover scale-220 -translate-y-13.5 -translate-x-0.5',
    ears: 'w-full h-full object-cover scale-120 translate-y-3',
    cheeks: 'w-full h-full object-cover scale-160 -translate-y-4',
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    const upload = new DirectUpload(file, direct_upload_url)
    upload.create((error, blob) => {
      setUploading(false)
      if (error) {
        notify('alert', 'Failed to upload image.')
        return
      }
      if (is_modal) {
        Axios.patch('/profile', { avatar_blob_signed_id: blob.signed_id }, { headers: modalHeaders() })
          .then(() => setCurrentAvatar(`/user-attachments/blobs/redirect/${blob.signed_id}/${blob.filename}`))
          .catch(() => notify('alert', 'Failed to save avatar.'))
      } else {
        router.patch(
          '/profile',
          { avatar_blob_signed_id: blob.signed_id },
          {
            preserveScroll: true,
            onSuccess: () => setCurrentAvatar(`/user-attachments/blobs/redirect/${blob.signed_id}/${blob.filename}`),
          },
        )
      }
    })
  }

  async function composeIconToBlob(): Promise<Blob | null> {
    const SIZE = 512
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    async function drawLayer(src: string | null, offsetY = 0) {
      if (!src) return
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.drawImage(img, 0, offsetY, SIZE, SIZE)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = src
      })
    }

    if (selectedBg) {
      await drawLayer(selectedBg)
    } else {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, SIZE, SIZE)
    }
    await drawLayer(selectedBody)
    await drawLayer(selectedEar)
    await drawLayer(selectedTie, Math.round((-12 / 320) * SIZE))
    await drawLayer(selectedCheek)
    await drawLayer(selectedMouth)
    await drawLayer(selectedEye)
    await drawLayer(selectedHat)

    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  async function handleSaveFalloutPfp() {
    setSaving(true)
    const blob = await composeIconToBlob()
    if (!blob) {
      setSaving(false)
      notify('alert', 'Failed to compose image.')
      return
    }
    const file = new File([blob], 'icon-pfp.png', { type: 'image/png' })
    const upload = new DirectUpload(file, direct_upload_url)
    upload.create((error, blobData) => {
      if (error) {
        setSaving(false)
        notify('alert', 'Failed to upload image.')
        return
      }
      const newAvatarUrl = `/user-attachments/blobs/redirect/${blobData.signed_id}/${blobData.filename}`
      if (is_modal) {
        Axios.patch('/profile', { avatar_blob_signed_id: blobData.signed_id }, { headers: modalHeaders() })
          .then(() => {
            setCurrentAvatar(newAvatarUrl)
            setSaving(false)
          })
          .catch(() => {
            setSaving(false)
            notify('alert', 'Failed to save.')
          })
      } else {
        router.patch(
          '/profile',
          { avatar_blob_signed_id: blobData.signed_id },
          {
            preserveScroll: true,
            onSuccess: () => {
              setCurrentAvatar(newAvatarUrl)
              setSaving(false)
            },
            onError: () => {
              setSaving(false)
              notify('alert', 'Failed to save.')
            },
          },
        )
      }
    })
  }

  async function handleSetAsSlack() {
    if (!has_slack_token) {
      window.location.href = '/auth/slack/start'
      return
    }
    setSettingSlack(true)
    const blob = await composeIconToBlob()
    if (!blob) {
      setSettingSlack(false)
      notify('alert', 'Failed to compose image.')
      return
    }
    const buffer = await blob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
    try {
      await Axios.post('/profile/set_slack_photo', { image_data: base64 }, { headers: { 'X-CSRF-Token': csrf } })
      notify('notice', 'Slack photo updated!')
    } catch (e: unknown) {
      if (Axios.isAxiosError(e) && e.response?.status === 401) {
        // Token was revoked — redirect to re-auth
        window.location.href = '/auth/slack/start'
      } else {
        notify('alert', 'Failed to set Slack photo.')
      }
    } finally {
      setSettingSlack(false)
    }
  }

  async function handleRandomize() {
    if (randomizing) return
    setRandomizing(true)

    function pick<T>(arr: T[], required = false): T | null {
      if (arr.length === 0) return null
      const pool = required ? arr : ([...arr, null] as (T | null)[])
      return pool[Math.floor(Math.random() * pool.length)]
    }

    const finalBody = pick(body_images, true)
    const finalBg = pick(bg_images)
    const finalEye = pick(eye_images)
    const finalHat = pick(hat_images)
    const finalMouth = pick(mouth_images)
    const finalTie = pick(tie_images)
    const finalEar = pick(ear_images)
    const finalCheek = pick(cheek_images)

    const TOTAL = 2200
    const start = Date.now()

    await new Promise<void>((resolve) => {
      function step() {
        const elapsed = Date.now() - start
        const progress = Math.min(elapsed / TOTAL, 1)

        if (progress >= 1) {
          setSelectedBody(finalBody)
          setSelectedBg(finalBg)
          setSelectedEye(finalEye)
          setSelectedHat(finalHat)
          setSelectedMouth(finalMouth)
          setSelectedTie(finalTie)
          setSelectedEar(finalEar)
          setSelectedCheek(finalCheek)
          resolve()
          return
        }

        setSelectedBody(pick(body_images, true))
        setSelectedBg(pick(bg_images))
        setSelectedEye(pick(eye_images))
        setSelectedHat(pick(hat_images))
        setSelectedMouth(pick(mouth_images))
        setSelectedTie(pick(tie_images))
        setSelectedEar(pick(ear_images))
        setSelectedCheek(pick(cheek_images))

        // Ease out: interval grows from 60ms → 280ms as progress approaches 1
        const interval = Math.round(60 + progress * progress * 220)
        setTimeout(step, interval)
      }
      step()
    })

    setRandomizing(false)
  }

  const profileView = (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-6">
      <button
        type="button"
        onClick={() => setShowCustomizer(true)}
        className="relative shrink-0 cursor-pointer group"
        aria-label="Customize profile picture"
      >
        <img
          src={currentAvatar}
          alt={display_name}
          className="rounded-lg size-40 outline-dark-brown outline-2 object-cover"
        />

        <div className="absolute inset-0 rounded-lg bg-dark-brown opacity-0 group-hover:opacity-30 transition-opacity" />
        <div className="absolute -bottom-3 -right-3 rounded-full w-8 h-8 border-dark-brown border-2 bg-beige flex items-center justify-center transition-opacity">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 16H3.425L13.2 6.225L11.775 4.8L2 14.575V16ZM0 18V13.75L13.2 0.575C13.4 0.391667 13.6208 0.25 13.8625 0.15C14.1042 0.05 14.3583 0 14.625 0C14.8917 0 15.15 0.05 15.4 0.15C15.65 0.25 15.8667 0.4 16.05 0.6L17.425 2C17.625 2.18333 17.7708 2.4 17.8625 2.65C17.9542 2.9 18 3.15 18 3.4C18 3.66667 17.9542 3.92083 17.8625 4.1625C17.7708 4.40417 17.625 4.625 17.425 4.825L4.25 18H0ZM12.475 5.525L11.775 4.8L13.2 6.225L12.475 5.525Z"
              fill="#1D1B20"
            />
          </svg>
        </div>
      </button>

      <h1 className="font-bold text-3xl text-dark-brown mt-4">{display_name}</h1>
      <div className="flex gap-2  text-brown text-xs items-center">
        <span className="">pronouns</span>
        <span className="w-1 h-1 bg-brown rounded-full inline-block" />
        <span className="">email@gmail.com</span>
      </div>
      <span className="text-brown text-sm mt-4">bing bong user bio here bing bong coming soon</span>

      <div className="mt-4 w-80">
        <ProgressBar progress={hoursProgress} borderClassName="border-dark-brown" />
        <span className="text-brown text-sm font-medium mt-1 block text-center">
          {hoursDisplay}h / {HOURS_GOAL}h
        </span>
      </div>
    </div>
  )

  const customizerView = (
    <div className="flex flex-col p-4 md:p-6">
      <button
        type="button"
        onClick={() => setShowCustomizer(false)}
        className="flex items-center gap-1 text-brown mb-4 cursor-pointer w-fit"
        aria-label="Back to profile"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M19 12H5M5 12L12 19M5 12L12 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </button>
      <div className="flex flex-col bg-brown gap-3 rounded-md w-full py-2 px-4">
        <ul className="flex gap-1">
          {TABS.map(({ key, label }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setActiveTab(key)}
                className={
                  activeTab === key
                    ? ' font-bold bg-beige px-1 py-1 text-brown rounded-sm'
                    : 'py-1 text-beige px-1 rounded-sm'
                }
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex h-full w-full gap-x-2 bg-brown rounded-md">
          <div className="flex flex-col gap-2">
            <div
              className="relative rounded-lg grow aspect-square border-2 border-dark-brown shrink-0 h-70"
              style={
                selectedBg
                  ? { backgroundImage: `url(${selectedBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { backgroundColor: 'white' }
              }
            >
              {selectedBody && (
                <img src={selectedBody} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {selectedEar && <img src={selectedEar} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              {selectedTie && (
                <img src={selectedTie} alt="" className="absolute -top-3 inset-0 w-full h-full object-cover" />
              )}
              {selectedCheek && (
                <img src={selectedCheek} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {selectedMouth && (
                <img src={selectedMouth} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {selectedEye && <img src={selectedEye} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              {selectedHat && <img src={selectedHat} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            </div>
            <div className="flex gap-1 w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-dark-brown text-beige px-1 py-1 rounded-sm w-fit flex items-center justify-center disabled:opacity-60 cursor-pointer"
                aria-label="Upload custom profile picture"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="#fcf1e5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSaveFalloutPfp}
                disabled={saving}
                className="bg-dark-brown text-beige px-1 py-1 rounded-sm w-fit flex items-center justify-center disabled:opacity-60 cursor-pointer"
                aria-label="Save as Fallout profile picture"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M17 21V13H7V21M7 3V8H15M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z"
                    stroke="#fcf1e5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSetAsSlack}
                disabled={settingSlack}
                className="text-sm font-medium bg-dark-brown text-beige px-3 py-1 rounded-md w-fit h-fit disabled:opacity-60 cursor-pointer"
              >
                {settingSlack ? 'Setting…' : 'Set as Slack'}
              </button>
              <button
                type="button"
                onClick={handleRandomize}
                disabled={randomizing}
                className="ml-auto bg-dark-brown text-beige px-1 py-1 rounded-sm w-fit flex items-center justify-center disabled:opacity-60 cursor-pointer"
                aria-label="Randomize character"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={randomizing ? 'animate-spin' : ''}
                >
                  <path
                    d="M1 4.00044V10.0004M1 10.0004H7M1 10.0004L5.64 5.64044C7.02091 4.26186 8.81245 3.36941 10.7447 3.09755C12.6769 2.8257 14.6451 3.18917 16.3528 4.1332C18.0605 5.07723 19.4152 6.55068 20.2126 8.33154C21.0101 10.1124 21.2072 12.1042 20.7742 14.0068C20.3413 15.9094 19.3017 17.6198 17.8121 18.8802C16.3226 20.1406 14.4637 20.8828 12.5157 20.9949C10.5677 21.107 8.63598 20.583 7.01166 19.5018C5.38734 18.4206 4.15839 16.8408 3.51 15.0004"
                    stroke="#fcf1e5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="h-full overflow-y-auto">
            <div className="grow grid grid-cols-3 gap-1">
              {imagesByTab[activeTab].map((src) => {
                const selected = selectedByTab[activeTab] === src
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => settersByTab[activeTab](src)}
                    className={`aspect-square rounded-sm overflow-hidden border-2 cursor-pointer bg-white  ${selected ? 'border-dark-brown' : 'border-beige'}`}
                  >
                    <img src={src} alt="" className={imageClassByTab[activeTab]} />
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => settersByTab[activeTab](null)}
                className={`aspect-square rounded overflow-hidden border-2 cursor-pointer bg-beige ${selectedByTab[activeTab] === null ? 'border-dark-brown bg-white' : 'border-beige bg-white'}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const content = (
    <div className="w-[600px] h-[520px] flex flex-col">{showCustomizer ? customizerView : profileView}</div>
  )

  const fileInput = (
    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
  )

  if (is_modal) {
    return (
      <Modal panelClasses="" paddingClasses="w-fit mx-auto top-1/2 -translate-y-1/2" closeButton={false}>
        <Frame showBorderOnMobile>
          {fileInput}
          {content}
        </Frame>
      </Modal>
    )
  }

  return (
    <>
      {fileInput}
      {content}
    </>
  )
}

ProfileShow.layout = (page: ReactNode) => page

export default ProfileShow
