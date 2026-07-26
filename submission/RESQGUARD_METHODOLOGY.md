# ResQGuard methodology

ResQGuard is a prototype safety-validation layer placed after translation and before citizen delivery.

## Checks

1. Required safety action remains present.
2. Numeric values remain unchanged.
3. Severity remains consistent across critical/red, severe/high/orange, moderate/yellow and low/green mappings in English, Kiswahili and Somali.
4. Location remains consistent.
5. Dangerous or contradictory wording is blocked.
6. A verified fallback replaces a rejected message.

## Evaluation set

The executable test fixture contains 72 manually reviewed labelled messages:

- 24 expected-safe messages
- 48 expected-unsafe mutations
- 3 languages: English, Kiswahili and Somali
- 8 unsafe failure categories
- changed numbers
- changed units
- missing instructions
- wrong severity
- wrong location
- dangerous wording
- incomplete translations
- wrong hazard
- correct translations

The downloadable CSV fixture is available at `public/resqguard-evaluation-cases.csv`.

## Measured result

- Messages tested: 72
- Unsafe messages detected: 48/48
- Safe messages approved: 22/24
- Number and unit decisions correct: 69/72
- Severity decisions correct: 72/72
- Fallback activations: 48/48 detected unsafe messages
- Average local rule-validation time: below 0.1 ms in the current test environment

The non-perfect result is intentional evidence of current prototype limitations. Two safe paraphrases are rejected because the required-action rule is conservative, and three incomplete translations correctly fail number/unit preservation because distance information is missing.
