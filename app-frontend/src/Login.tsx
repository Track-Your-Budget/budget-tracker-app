import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LayoutDashboard } from 'lucide-react'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'

export default function Login() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 mb-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Budget Tracker</CardTitle>
          <CardDescription>
            Sign in with one of the supported providers to manage your finances
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <SocialLoginButtons />
        </CardContent>
      </Card>
    </div>
  )
}

