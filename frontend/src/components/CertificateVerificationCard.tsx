'use client'

import { useRef, useState } from 'react'
import { Award, CheckCircle2, Clock3, FileUp, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api, Profile } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024
const FILE_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

interface CertificateVerificationCardProps {
  profile: Profile
  language: string
  onProfileChange: (profile: Profile) => void
}

export function CertificateVerificationCard({
  profile,
  language,
  onProfileChange,
}: CertificateVerificationCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const isRussian = language === 'ru'
  const status = profile.certificate_status || 'not_submitted'

  const copy = {
    title: isRussian ? 'Подтверждение обучения' : 'Training certificate verification',
    description: isRussian
      ? 'Загрузите сертификат об обучении. Администратор проверит его вручную; сам документ клиентам не показывается.'
      : 'Upload your training certificate. An administrator will review it manually; clients never see the document.',
    upload: profile.certificate_url
      ? (isRussian ? 'Загрузить новый сертификат' : 'Upload a new certificate')
      : (isRussian ? 'Загрузить сертификат' : 'Upload certificate'),
  }

  const statusView = {
    not_submitted: {
      icon: FileUp,
      text: isRussian ? 'Сертификат ещё не загружен' : 'No certificate submitted',
      classes: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300',
    },
    pending: {
      icon: Clock3,
      text: isRussian ? 'Ожидает ручной проверки' : 'Waiting for manual review',
      classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    approved: {
      icon: CheckCircle2,
      text: isRussian ? 'Сертификат проверен Tattoo HUB' : 'Certificate verified by Tattoo HUB',
      classes: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    rejected: {
      icon: XCircle,
      text: isRussian ? 'Сертификат отклонён' : 'Certificate rejected',
      classes: 'bg-red-500/10 text-red-700 dark:text-red-300',
    },
  }[status]

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const extension = FILE_EXTENSIONS[file.type]
    if (!extension) {
      toast.error(isRussian ? 'Поддерживаются PDF, JPG, PNG и WEBP' : 'Use PDF, JPG, PNG or WEBP')
      return
    }
    if (file.size > MAX_CERTIFICATE_SIZE) {
      toast.error(isRussian ? 'Файл должен быть не больше 10 МБ' : 'The file must be 10 MB or smaller')
      return
    }

    setIsUploading(true)
    const objectPath = `${profile.id}/${crypto.randomUUID()}.${extension}`
    try {
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(objectPath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      try {
        const result = await api.submitCertificate(objectPath)
        const oldPath = profile.certificate_url
        onProfileChange({
          ...profile,
          certificate_url: objectPath,
          certificate_status: result.certificate_status,
          certificate_submitted_at: result.certificate_submitted_at,
          certificate_reviewed_at: undefined,
          certificate_rejection_reason: undefined,
        })
        toast.success(isRussian ? 'Сертификат отправлен на проверку' : 'Certificate sent for review')

        if (oldPath && oldPath !== objectPath) {
          void supabase.storage.from('certificates').remove([oldPath])
        }
      } catch (error) {
        await supabase.storage.from('certificates').remove([objectPath])
        throw error
      }
    } catch (error) {
      console.error(error)
      toast.error(isRussian ? 'Не удалось загрузить сертификат' : 'Certificate upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const StatusIcon = statusView.icon

  return (
    <section className="rounded-3xl border border-primary-500/15 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:bg-neutral-900/70 md:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <Award className="h-5 w-5 text-primary-500" />
            {copy.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {copy.description}
          </p>
        </div>
        <div className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${statusView.classes}`}>
          <StatusIcon className="h-4 w-4" />
          {statusView.text}
        </div>
      </div>

      {status === 'rejected' && profile.certificate_rejection_reason && (
        <div className="mt-5 flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">{isRussian ? 'Причина отказа' : 'Rejection reason'}</p>
            <p className="mt-1">{profile.certificate_rejection_reason}</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileUp className="h-4 w-4" />
          {isUploading ? (isRussian ? 'Загрузка…' : 'Uploading…') : copy.upload}
        </button>
        <span className="text-xs text-neutral-500">PDF, JPG, PNG, WEBP · max 10 MB</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
          aria-label={copy.upload}
        />
      </div>
    </section>
  )
}
