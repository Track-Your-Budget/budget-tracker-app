import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/hooks/use-toast'
import { completeOnboarding, type OnboardingResult } from '@/lib/api/onboarding'

interface WelcomeDialogProps {
  open: boolean
  /** First name for the greeting; omitted when unknown. */
  userName?: string
  /** Called once the server has recorded the answer, with what it created. */
  onDone: (result: OnboardingResult) => void
}

/**
 * Greets a new account and offers sample transactions. Closing the dialog
 * by any means counts as "not now": the question is asked exactly once.
 */
export function WelcomeDialog({ open, userName, onDone }: WelcomeDialogProps) {
  const [busy, setBusy] = useState<'sample' | 'skip' | null>(null)
  const { toast } = useToast()

  const answer = async (sampleData: boolean) => {
    if (busy) return
    setBusy(sampleData ? 'sample' : 'skip')
    try {
      onDone(await completeOnboarding(sampleData))
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      toast({
        title: 'Something went wrong',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void answer(false)
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>Welcome{userName ? `, ${userName}` : ''}!</DialogTitle>
          <DialogDescription>
            Your account is empty right now. Want to start with sample data and test the App? We can add some data, so that you can see how it works. You
            can delete them at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy !== null} onClick={() => answer(false)}>
            {busy === 'skip' ? <Spinner /> : null}
            Not now
          </Button>
          <Button disabled={busy !== null} onClick={() => answer(true)}>
            {busy === 'sample' ? <Spinner /> : <Sparkles />}
            Add sample data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
