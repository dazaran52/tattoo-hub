import { X, Download, Printer } from 'lucide-react'

interface ImageViewerModalProps {
  isOpen: boolean
  imageUrl: string | null
  onClose: () => void
  showActions?: boolean
}

export function ImageViewerModal({ isOpen, imageUrl, onClose, showActions = false }: ImageViewerModalProps) {
  if (!isOpen || !imageUrl) return null

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `image_${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading image:', err)
      // Fallback for simple opening
      window.open(imageUrl, '_blank')
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Image</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: white; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              @media print {
                @page { margin: 0; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" onload="window.print();window.close()" />
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl w-full h-full max-h-[90vh] flex flex-col items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -top-12 right-0 flex items-center gap-3">
          {showActions && (
            <>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-colors backdrop-blur-md"
              >
                <Printer className="w-4 h-4" />
                <span>Печать</span>
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-colors backdrop-blur-md"
              >
                <Download className="w-4 h-4" />
                <span>Скачать</span>
              </button>
            </>
          )}
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md ml-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <img 
          src={imageUrl} 
          alt="Full screen view" 
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
        />
      </div>
    </div>
  )
}
