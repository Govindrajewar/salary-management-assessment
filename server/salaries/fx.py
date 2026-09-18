"""Static FX table for cross-currency salary comparison.

Hardcoded rather than a live-rate API call: no external dependency, no
network failure mode, and the comparison view already tells the caller
these are approximate rather than tied to a specific date.
"""

RATES_TO_USD = {
    "USD": 1.0,
    "GBP": 1.27,
    "EUR": 1.09,
    "INR": 0.012,
    "CAD": 0.74,
    "AUD": 0.66,
    "JPY": 0.0067,
    "BRL": 0.20,
    "SGD": 0.74,
}


def convert(amount, from_currency, to_currency):
    if from_currency == to_currency:
        return float(amount)
    usd = float(amount) * RATES_TO_USD[from_currency]
    return usd / RATES_TO_USD[to_currency]
