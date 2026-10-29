import * as React from 'react'
import { transcribeAudio } from '@/lib/api/transactions'

export type VoiceInputStatus = 'idle' | 'recording' | 'sending'

/** Records from the microphone and sends the audio to the server for transcription. */
export function useVoiceInput(onError: (error: unknown) => void) {
  const [status, setStatus] = React.useState<VoiceInputStatus>('idle')
  const recorderRef = React.useRef<MediaRecorder | null>(null)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => chunks.push(event.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        recorderRef.current = null
        setStatus('sending')
        try {
          // The transcript is not used yet.
          await transcribeAudio(new Blob(chunks, { type: recorder.mimeType }))
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
