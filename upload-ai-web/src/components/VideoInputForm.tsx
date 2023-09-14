import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/axios'
import { getFFmpeg } from '@/lib/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { FileVideo, Upload } from 'lucide-react'
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react'

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessages = {
  converting: 'Convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!',
}

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void
}

export function VideoInputForm(props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')

  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) {
      return
    }

    const selectedFile = files[0]

    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    console.log('Convert started.')
    const file = await fetchFile(video)

    console.log('File')

    const ffmpeg = await getFFmpeg()
    await ffmpeg.writeFile('input.mp4', file)

    // ffmpeg.on('log', (log) => console.log(log))

    ffmpeg.on('progress', (conversion) => {
      console.log('Convert progress: ' + Math.round(conversion.progress * 100))
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3',
    ])

    const data = await ffmpeg.readFile('output.mp3')
    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg',
    })

    console.log('Convert finished.')
    return audioFile
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!videoFile || !promptInputRef.current?.value) {
      return
    }

    setStatus('converting')

    /* converter o video em áudio */
    const audioFile = await convertVideoToAudio(videoFile)
    const data = new FormData()

    data.append('file', audioFile)

    setStatus('uploading')
    const response = await api.post('/videos', data)
    const videoId = response.data.video.id
    const prompt = promptInputRef.current.value

    setStatus('generating')
    console.log('Transcription started.')
    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    })

    console.log('Transcription finished.')
    setStatus('success')

    props.onVideoUploaded(videoId)
  }

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile)
  }, [videoFile])

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        className="flex flex-col items-center justify-center gap-2 relative border rounded-md aspect-video cursor-pointer border-dashed text-sm text-muted-foreground hover:bg-primary/5"
        htmlFor="video"
      >
        {previewURL ? (
          <video
            src={previewURL}
            controls={false}
            className="pointer-events-none absolute inset-0"
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" /> Selecione um video
          </>
        )}
      </label>
      <input
        className="sr-only"
        type="file"
        id="video"
        accept="video/mp4"
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          className="h-20 resize-none leading-relaxed"
          ref={promptInputRef}
          id="transcription_prompt"
          placeholder="Inclua palavras-chave mencionadas no video separadas por vírgula (,)"
          disabled={status !== 'waiting'}
        />
      </div>

      <Button
        className="w-full data-[success=true]:bg-emerald-400"
        data-success={status === 'success'}
        disabled={status !== 'waiting'}
      >
        {status === 'waiting' ? (
          <>
            Carregar vídeo <Upload className="w-4 h-4 ml-2" />
          </>
        ) : (
          statusMessages[status]
        )}
      </Button>
    </form>
  )
}
