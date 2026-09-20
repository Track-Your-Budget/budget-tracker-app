import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { MonthlyData } from '@/lib/types'
import { formatWholeCurrency } from '@/lib/format'

// Colors come from the theme tokens in index.css, not from literals, so a
// theme switch reaches the chart like it reaches everything else. Grid, axis
// ticks, tooltip and legend are styled by ChartContainer / ChartTooltipContent
// through the same tokens.
const chartConfig = {
  income: { label: 'Einnahmen', color: 'var(--chart-1)' },
  expense: { label: 'Ausgaben', color: 'var(--chart-4)' },
} satisfies ChartConfig

interface ExpenseChartProps {
  data: MonthlyData[]
  isLoading?: boolean
}

export function ExpenseChart({ data, isLoading }: ExpenseChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Monatliche Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Monatliche Übersicht</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatWholeCurrency}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <>
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex flex-1 items-center justify-between gap-2 leading-none">
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                        </span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {formatWholeCurrency(Number(value))}
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
