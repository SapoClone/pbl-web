import { ChevronLeft, ChevronRight, ImagePlus, Loader2, UploadCloud, X } from "lucide-react"
import { useRef, useState } from "react"
import { uploadProductImage } from "@/api/catalog/products"
import { Button } from "@/components/ui/button"

export type ProductImageDraft = {
  id?: string
  key: string
  url: string
  altText?: string | null
}

type Props = {
  images: ProductImageDraft[]
  onChange: (images: ProductImageDraft[]) => void
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
}

const MAX_IMAGES = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024
const uploadIdFromKey = (key: string) => key.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0]

export const productImageDrafts = (images: Array<{ key: string; url: string; altText?: string | null; sortOrder: number }>): ProductImageDraft[] =>
  [...images]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((image) => ({ ...image, id: uploadIdFromKey(image.key) }))

export function ProductImageUpload({ images, onChange, onUploadingChange, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const addFiles = async (files: File[]) => {
    if (files.length === 0 || disabled) return
    if (images.length + files.length > MAX_IMAGES) {
      setError(`Mỗi sản phẩm có tối đa ${MAX_IMAGES} ảnh.`)
      return
    }
    if (files.some((file) => !["image/png", "image/jpeg"].includes(file.type))) {
      setError("Chỉ hỗ trợ ảnh PNG hoặc JPEG.")
      return
    }
    if (files.some((file) => file.size === 0 || file.size > MAX_FILE_SIZE)) {
      setError("Mỗi ảnh phải có dung lượng từ 1 byte đến 5 MB.")
      return
    }

    setUploading(true)
    onUploadingChange?.(true)
    setError("")
    try {
      const uploaded = await Promise.all(files.map(uploadProductImage))
      onChange([...images, ...uploaded])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh lên.")
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const remove = (index: number) => onChange(images.filter((_, current) => current !== index))
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <section className="md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-600">Ảnh sản phẩm</p>
          <p className="mt-1 text-xs text-slate-400">PNG hoặc JPEG, tối đa 5 MB mỗi ảnh. Ảnh đầu tiên là ảnh bìa.</p>
        </div>
        <Button type="button" variant="outline" disabled={disabled || uploading || images.length >= MAX_IMAGES} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          Thêm ảnh
        </Button>
      </div>
      <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg" multiple onChange={(event) => void addFiles(Array.from(event.target.files ?? []))} />
      <button
        type="button"
        disabled={disabled || uploading || images.length >= MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void addFiles(Array.from(event.dataTransfer.files))
        }}
        className={`mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-5 text-left transition ${dragging ? "border-[#16866f] bg-[#e6f5ee]" : "border-slate-300 bg-slate-50 hover:border-[#16866f]/60 hover:bg-[#f6fbf9]"} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {uploading ? <Loader2 className="h-6 w-6 animate-spin text-[#16866f]" /> : <UploadCloud className="h-6 w-6 text-[#16866f]" />}
        <span>
          <span className="block text-sm font-medium text-slate-700">{uploading ? "Đang tải ảnh lên..." : "Kéo thả ảnh vào đây hoặc bấm để chọn"}</span>
          <span className="mt-0.5 block text-xs text-slate-400">Đã chọn {images.length}/{MAX_IMAGES} ảnh</span>
        </span>
      </button>
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {images.map((image, index) => (
            <div key={`${image.id ?? image.key}-${index}`} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img src={image.url} alt={image.altText ?? `Ảnh sản phẩm ${index + 1}`} className="aspect-square w-full object-cover" />
              {index === 0 && <span className="absolute left-2 top-2 rounded bg-[#16866f] px-2 py-1 text-[10px] font-medium text-white">Ảnh bìa</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-slate-900/60 p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)} className="rounded bg-white p-1 text-slate-700 disabled:opacity-40" aria-label="Di chuyển ảnh sang trái"><ChevronLeft size={15} /></button>
                <button type="button" disabled={disabled || index === images.length - 1} onClick={() => move(index, 1)} className="rounded bg-white p-1 text-slate-700 disabled:opacity-40" aria-label="Di chuyển ảnh sang phải"><ChevronRight size={15} /></button>
                <button type="button" disabled={disabled} onClick={() => remove(index)} className="rounded bg-white p-1 text-red-600" aria-label="Xóa ảnh"><X size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
    </section>
  )
}
