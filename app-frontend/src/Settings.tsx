import { BellRing, CalendarClock, Heart } from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { SettingsHeader } from '@/components/settings/settings-header'
import { FavoritesTab } from '@/components/settings/favorites-tab'
import { ThresholdsTab } from '@/components/settings/thresholds-tab'
import { ScheduledTab } from '@/components/settings/scheduled-tab'

export default function Settings() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SettingsHeader />

        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3 bg-card p-1 lg:w-fit">
            <TabsTrigger value="favorites" className="gap-2 px-5 py-2.5">
              <Heart className="size-4" /> Favoriten
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="gap-2 px-5 py-2.5">
              <BellRing className="size-4" /> Schwellenwerte
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2 px-5 py-2.5">
              <CalendarClock className="size-4" /> Geplant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites">
            <FavoritesTab />
          </TabsContent>
          <TabsContent value="thresholds">
            <ThresholdsTab />
          </TabsContent>
          <TabsContent value="scheduled">
            <ScheduledTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
