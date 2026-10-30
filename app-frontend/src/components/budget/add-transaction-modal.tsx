import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ArrowLeft, Check, Mic, Pencil, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useVoiceInput, type VoiceInputStatus } from '@/hooks/use-voice-input'
import type { QuickTransactionInput } from '@/lib/api/transactions'
import type { QuickAddFormValues } from '@/lib/transaction-form'
import { cn } from '@/lib/utils'

interface AddTransactionModalProps {
  /**
   * Title, amount, date, category and type are derived server-side from `text`.
   * Resolves to whether it was saved; the dialog stays open otherwise.
   */
  onAddTransaction: (transaction: QuickTransactionInput) => Promise<boolean>
}

const emptyValues = (): QuickAddFormValues => ({
  text: '',
})

// Shared by both views so switching between them feels like one motion.
const viewTransition = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.18, ease: 'easeOut' },
} as const

export function AddTransactionModal({ onAddTransaction }: AddTransactionModalProps) {
  const [open, setOpen] = useState(false)
  // Set once a transcript lands in the field, so the form asks the user to check it.
  const [fromVoice, setFromVoice] = useState(false)
  // What Whisper heard, shown in the voice view until saved, edited or dropped.
  const [transcript, setTranscript] = useState<string | null>(null)
  const [savingTranscript, setSavingTranscript] = useState(false)
  const form = useForm<QuickAddFormValues>({ defaultValues: emptyValues() })
  const { toast } = useToast()
  const voice = useVoiceInput(
    // Not saved directly: the user approves it in the voice view first.
    setTranscript,
    (error) => {
      console.error('Voice input failed', error)
      toast({
        title: 'Voice input failed',
        description:
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'Microphone access was denied.'
            : 'Could not record or transcribe. Please type the transaction instead.',
        variant: 'destructive',
      })
    },
  )
  const reset = () => {
    form.reset(emptyValues())
    setFromVoice(false)
    setTranscript(null)
  }

  const save = async (text: string) => {
    const saved = await onAddTransaction({ text: text.trim() })
    if (!saved) return
    reset()
    setOpen(false)
  }

  const handleSubmit = (values: QuickAddFormValues) => save(values.text)

  const saveTranscript = async () => {
    if (!transcript) return
    setSavingTranscript(true)
    try {
      await save(transcript)
    } finally {
      setSavingTranscript(false)
    }
  }

  /** Moves the transcript into the text field for corrections. */
  const editTranscript = () => {
    form.setValue('text', transcript ?? '', { shouldDirty: true, shouldValidate: true })
    setFromVoice(true)
    setTranscript(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      voice.cancel()
      reset()
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 px-3 py-2 text-base font-medium rounded-2xl">
          <Plus className="size-6" />
          Add transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <MotionConfig reducedMotion="user">
          <AnimatePresence mode="wait" initial={false}>
            {voice.status !== 'idle' || transcript !== null ? (
              <motion.div key="voice" {...viewTransition}>
                <DialogTitle className="sr-only">New transaction by voice</DialogTitle>
                {voice.status !== 'idle' ? (
                  <VoiceRecorder
                    status={voice.status}
                    onStop={voice.stop}
                    onCancel={voice.cancel}
                  />
                ) : (
                  <TranscriptReview
                    transcript={transcript ?? ''}
                    saving={savingTranscript}
                    onRecordAgain={voice.start}
                    onEdit={editTranscript}
                    onSave={saveTranscript}
                    onBack={() => setTranscript(null)}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                {...viewTransition}
                // The field only exists after the voice view has left, so focus it here.
                onAnimationComplete={() => form.setFocus('text')}
              >
                <DialogHeader>
                  <DialogTitle>New transaction</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
                    <div className="grid gap-4 py-4">
                      {/* Title, amount and an optional date ("gestern") in one line;
                          the server picks them apart, no date means today. */}
                      <FormField
                        control={form.control}
                        name="text"
                        rules={{
                          validate: (value) =>
                            value.trim().length > 0 || 'Please describe the transaction.',
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="justify-center text-lg">
                              {fromVoice ? 'Did we get that right?' : 'What and how much?'}
                            </FormLabel>
                            <motion.div
                              className="relative rounded-md"
                              // Flash the field once so the transcript is noticed.
                              initial={fromVoice ? { boxShadow: '0 0 0 4px var(--color-primary)' } : false}
                              animate={{ boxShadow: '0 0 0 0px var(--color-primary)' }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            >
                              <FormControl>
                                <Input
                                  placeholder="e.g. Rewe 23,50 yesterday"
                                  className="h-12 pl-4 pr-16 md:text-base border border-primary/50"
                                  autoFocus
                                  {...field}
                                />
                              </FormControl>
                              {/* Voice entry: switches the dialog to the recorder. */}
                              <div className="absolute inset-y-0 right-0 flex items-center border-l border-input px-1.5 ">
                                <motion.button
                                  type="button"
                                  className="hover:cursor-pointer px-2"
                                  onClick={voice.start}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  aria-label="Add by voice"
                                  title="Add by voice"
                                >
                                  <Mic className="size-7" />
                                </motion.button>
                              </div>
                            </motion.div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        className="w-full gap-2 text-base"
                        disabled={form.formState.isSubmitting}
                      >
                        <Check className="size-6" />
                        Save
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </MotionConfig>
      </DialogContent>
    </Dialog>
  )
}

interface VoiceRecorderProps {
  status: Exclude<VoiceInputStatus, 'idle'>
  onStop: () => void
  onCancel: () => void
}

/** The whole dialog while recording: one big mic, tapped again to send. */
function VoiceRecorder({ status, onStop, onCancel }: VoiceRecorderProps) {
  const recording = status === 'recording'

  return (
    // Tall enough for the rings to ripple without being clipped by the dialog.
    <div className="relative flex min-h-65 items-center justify-center">
      {/* Back to the form, discarding the recording. Hidden while sending. */}
      <button
        onClick={onCancel}
        className={cn('absolute left-0 top-0 hover:cursor-pointer', !recording && 'invisible')}
        aria-label="Back"
        title="Back"
      >
        <ArrowLeft className="size-6" />
      </button>
      <div className="relative flex size-32 items-center justify-center">
        {/* Rings ripple out while the mic is live. */}
        {recording &&
          [0, 1].map((ring) => (
            <motion.span
              key={ring}
              className="absolute inset-0 rounded-full bg-primary/30"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 1.6, ease: 'easeOut', repeat: Infinity, delay: ring * 0.8 }}
            />
          ))}
        {/* While sending, an arc circles the button instead. */}
        {!recording && (
          <motion.span
            className="absolute -inset-2 rounded-full border-4 border-primary/20 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
          />
        )}
        <motion.button
          type="button"
          className={cn(
            'relative flex size-32 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg',
            recording ? 'hover:cursor-pointer' : 'cursor-wait',
          )}
          onClick={onStop}
          disabled={!recording}
          initial={{ scale: 0.6 }}
          animate={{ scale: recording ? [1, 1.05, 1] : 0.9 }}
          transition={
            recording
              ? { duration: 1.6, ease: 'easeInOut', repeat: Infinity }
              : { type: 'spring', stiffness: 300, damping: 20 }
          }
          whileTap={recording ? { scale: 0.9 } : undefined}
          aria-label={recording ? 'Stop recording and send' : 'Transcribing'}
          title={recording ? 'Stop recording and send' : 'Transcribing'}
        >
          <Mic className="size-14" />
        </motion.button>
        {/* Hangs below the mic without taking up space, so the mic stays dead centre. */}
        <p
          className="absolute top-full mt-10 mb-10 whitespace-nowrap text-2xl font-medium"
          aria-live="polite"
        >
          {recording ? 'Listening…' : 'Transcribing…'}
        </p>
      </div>
    </div>
  )
}

interface TranscriptReviewProps {
  transcript: string
  saving: boolean
  onRecordAgain: () => void
  onEdit: () => void
  onSave: () => void
  onBack: () => void
}

/** What Whisper heard, for the user to approve, correct or record again. */
function TranscriptReview({
  transcript,
  saving,
  onRecordAgain,
  onEdit,
  onSave,
  onBack,
}: TranscriptReviewProps) {
  const words = transcript.split(/\s+/).filter(Boolean)

  return (
    <div className="relative flex min-h-65 flex-col items-center justify-center gap-6 pt-8">
      {/* Back to the empty form, dropping the transcript. */}
      <button
        onClick={onBack}
        className="absolute left-0 top-0 hover:cursor-pointer"
        aria-label="Back"
        title="Back"
      >
        <ArrowLeft className="size-6" />
      </button>

      {/* The big mic settles into a small one that records again. */}
      <motion.button
        type="button"
        className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:cursor-pointer disabled:cursor-wait disabled:opacity-60"
        onClick={onRecordAgain}
        disabled={saving}
        initial={{ scale: 1.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Record again"
        title="Record again"
      >
        <Mic className="size-8" />
      </motion.button>

      {/* Word by word, so it reads as if it is being written down. */}
      <p className="text-center text-2xl font-medium" aria-live="polite">
        {words.length > 0 ? (
          words.map((word, index) => (
            <motion.span
              key={`${index}-${word}`}
              className="inline-block whitespace-pre"
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.25, delay: 0.15 + index * 0.06 }}
            >
              {index < words.length - 1 ? `${word} ` : word}
            </motion.span>
          ))
        ) : (
          <span className="text-muted-foreground">Didn&apos;t catch that. Tap the mic to try again.</span>
        )}
      </p>

      <motion.div
        className="flex w-full gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.25 + words.length * 0.06 }}
      >
        <Button
          type="button"
          variant="outline"
          className="flex-1 gap-2 text-base"
          onClick={onEdit}
          disabled={saving || words.length === 0}
        >
          <Pencil className="size-5" />
          Edit
        </Button>
        <Button
          type="button"
          className="flex-1 gap-2 text-base"
          onClick={onSave}
          disabled={saving || words.length === 0}
          // Enter approves right away.
          autoFocus
        >
          <Check className="size-6" />
          Save
        </Button>
      </motion.div>
    </div>
  )
}
