import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { COUNTRIES, CURRENCIES, formatSalary } from '@/lib/constants'
import { useCompareCountriesQuery } from '@/hooks/useCompareCountries'

export function ComparePage() {
  const [country1, setCountry1] = useState<string | null>(null)
  const [country2, setCountry2] = useState<string | null>(null)
  const [currency, setCurrency] = useState<string | null>(null)
  const [includeTerminated, setIncludeTerminated] = useState(false)

  const { data, isLoading, isError } = useCompareCountriesQuery(
    country1,
    country2,
    currency,
    includeTerminated,
  )

  const countryLabel = (code: string) => COUNTRIES.find((c) => c.code === code)?.label ?? code

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Compare countries</h1>
        <Button
          variant={includeTerminated ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setIncludeTerminated((v) => !v)}
        >
          {includeTerminated ? 'Including terminated' : 'Active only'}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={country1 ?? undefined} onValueChange={setCountry1}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Country 1" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">vs</span>

        <Select value={country2 ?? undefined} onValueChange={setCountry2}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Country 2" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currency ?? undefined} onValueChange={setCurrency}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Pick a currency above - every employee's salary is converted into it (static FX rates,
        not a live feed) so the two countries stay comparable even when paid differently.
      </p>

      {isError && <p className="text-destructive">Failed to load comparison.</p>}

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && data && country1 && country2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[country1, country2].map((country) => {
            const row = data[country]
            return (
              <Card key={country}>
                <CardHeader>
                  <CardTitle className="text-base">{countryLabel(country)}</CardTitle>
                </CardHeader>
                <CardContent>
                  {!row || row.avg_salary === null ? (
                    <p className="text-sm text-muted-foreground">No matching employees.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-semibold">
                        {formatSalary(row.avg_salary, row.currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        average across {row.count} employee{row.count === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
