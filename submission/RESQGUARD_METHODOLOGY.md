# ResQGuard methodology

ResQGuard is a prototype safety-validation layer placed after translation and before citizen delivery.

## Checks

1. Required safety action remains present.
2. Numeric values remain unchanged.
3. Severity remains consistent.
4. Location remains consistent.
5. Dangerous or contradictory wording is blocked.
6. A verified fallback replaces a rejected message.

## Evaluation set

The executable test fixture contains 50 labelled messages:

- 25 expected-safe messages
- 25 expected-unsafe messages
- changed numbers and units
- missing instructions
- wrong severity
- wrong location
- dangerous wording
- correct and incomplete translations

## Measured result

- Messages tested: 50
- Unsafe messages detected: 23/25
- Safe messages approved: 24/25
- Number-preservation decisions correct: 48/50
- Fallback activations: 23/23 detected unsafe messages
- Average local rule-validation time: below 0.1 ms in the current test environment

The non-perfect result is intentional evidence of current prototype limitations. Unit changes written with the same digits remain a known weakness, and one safe paraphrase is rejected because the required-action rule is conservative.

