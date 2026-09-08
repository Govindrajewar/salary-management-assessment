import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStatsQuery } from '@/hooks/useDashboard'
import { StatsBarChart } from '@/components/dashboard/StatsBarChart'
import { StatsTable } from '@/components/dashboard/StatsTable'

export function DashboardPage() {
  const [includeTerminated, setIncludeTerminated] = useState(false)
  const { data, isLoading, isError } = useDashboardStatsQuery(includeTerminated)

  const currencies = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    data.by_department.forEach((r) => set.add(r.currency))
    data.by_country.forEach((r) => set.add(r.currency))
    return [...set].sort()
  }, [data])

  const [currency, setCurrency] = useState<string | null>(null)
  const activeCurrency = currency ?? currencies[0] ?? null

  const byDepartment = data?.by_department.filter((r) => r.currency === activeCurrency) ?? []
  const byCountry = data?.by_country.filter((r) => r.currency === activeCurrency) ?? []

  if (isError) {
    return <p className="text-destructive">Failed to load dashboard stats.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pay analytics</h1>
        <div className="flex items-center gap-3">
          <Button
            variant={includeTerminated ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setIncludeTerminated((v) => !v)}
          >
            {includeTerminated ? 'Including terminated' : 'Active only'}
          </Button>
          {currencies.length > 0 && (
            <Select value={activeCurrency ?? undefined} onValueChange={setCurrency}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Figures are never averaged across currencies - pick a currency above to see its own
        department and country breakdown.
      </p>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && currencies.length === 0 && (
        <p className="text-muted-foreground">No data for the current filter.</p>
      )}

      {!isLoading && activeCurrency && (
        <Tabs defaultValue="department">
          <TabsList>
            <TabsTrigger value="department">By department</TabsTrigger>
            <TabsTrigger value="country">By country</TabsTrigger>
          </TabsList>

          <TabsContent value="department" className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average salary by department ({activeCurrency})</CardTitle>
              </CardHeader>
              <CardContent>
                <StatsBarChart rows={byDepartment} labelKey="department__name" currency={activeCurrency} />
              </CardContent>
            </Card>
            <StatsTable rows={byDepartment} labelKey="department__name" labelHeader="Department" />
          </TabsContent>

          <TabsContent value="country" className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average salary by country ({activeCurrency})</CardTitle>
              </CardHeader>
              <CardContent>
                <StatsBarChart rows={byCountry} labelKey="country" currency={activeCurrency} />
              </CardContent>
            </Card>
            <StatsTable rows={byCountry} labelKey="country" labelHeader="Country" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
