import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

interface Template {
  id: string
  title: string
  category: string
  amount: string
  type: 'expense' | 'income'
}

const initialTemplates: Template[] = [
  {
    id: '1',
    title: 'Weekly groceries',
    category: 'Groceries',
    amount: '€85.00',
    type: 'expense',
  },
  { id: '2', title: 'Monthly rent', category: 'Housing', amount: '€1,200.00', type: 'expense' },
  { id: '3', title: 'Freelance payment', category: 'Salary', amount: '€800.00', type: 'income' },
]

interface TemplateFormValues {
  title: string
}

export function FavoritesTab() {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const form = useForm<TemplateFormValues>({ defaultValues: { title: '' } })
  const { toast } = useToast()

  const addTemplate = ({ title }: TemplateFormValues) => {
    setTemplates((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        category: 'Miscellaneous',
        amount: '€0.00',
        type: 'expense',
      },
    ])
    form.reset({ title: '' })
    toast({
      title: 'Template saved',
      description: 'The new quick template was added to your favorites.',
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Quick templates</CardTitle>
          <CardDescription>Prefill frequent transactions with one click.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between rounded-xl border bg-muted/20 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <WalletCards className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{template.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {template.category} · {template.amount}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${template.title}`}
                onClick={() =>
                  setTemplates((current) => current.filter((item) => item.id !== template.id))
                }
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Add favorite</CardTitle>
          <CardDescription>Create a new template for your transactions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(addTemplate)}
              noValidate
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="title"
                rules={{
                  validate: (value) =>
                    value.trim().length > 0 || 'Please enter a name for the template.',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Coffee to go" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">
                <Plus /> Create template
              </Button>
            </form>
          </Form>
          <Separator />
          <div className="rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Tip</p>
            <p className="mt-1">
              You will be able to use quick templates directly in the transaction form.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
