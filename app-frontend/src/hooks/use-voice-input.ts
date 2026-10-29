import * as React from 'react'
import { transcribeAudio } from '@/lib/api/transactions'

export type VoiceInputStatus = 'idle' | 'recording' | 'sending'

// Asked for explicitly: left to itself the browser may label the recording
// video/webm or nothing at all, which the server rejects as not audio.
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']

/** Records from the microphone and sends the audio to the server for transcription. */
export function useVoiceInput(
  onTranscript: (text: string) => void,
  onError: (error: unknown) => void,
) {
  const [status, setStatus] = React.useState<VoiceInputStatus>('idle')
  const recorderRef = React.useRef<MediaRecorder | null>(null)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => chunks.push(event.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        recorderRef.current = null
        setStatus('sending')
        try {
          const { text } = await transcribeAudio(new Blob(chunks, { type: recorder.mimeType }))
          onTranscript(text.trim())
        } catch (error) {
          onError(error)
        } finally {
          setStatus('idle')
        }
      }

      recorderRef.current = recorder
      recorder.start()
      setStatus('recording')
    } catch (error) {
      onError(error)
      setStatus('idle')
    }
  }

  const stop = () => recorderRef.current?.stop()

  /** Stops recording and drops the audio without sending it. */
  const cancel = React.useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return
    recorder.onstop = null
    recorder.stop()
    recorder.stream.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
    setStatus('idle')
  }, [])

  // Release the microphone if the component unmounts mid-recording.
  React.useEffect(() => cancel, [cancel])

  return { status, start, stop, cancel }
}
