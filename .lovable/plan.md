

## Change Default Bracket Settings to Double Elimination + Double Grand Final

### What changes
Update the default form values in two files so new brackets default to "Double Elimination" format with "double" (bracket reset) grand final.

### Files

**1. `src/components/playoffs/BracketForm.tsx`** (line 50)
- Change `format` default from `'Single Elimination'` to `'Double Elimination'`
- Change `grandFinalType` default from `'simple'` to `'double'`

**2. `src/components/playoffs/form/hooks/useBracketFormState.ts`** (lines 24, 26)
- Change `format` default from `BRACKET_FORMATS.SINGLE` to `BRACKET_FORMATS.DOUBLE`
- Change `grandFinalType` default from `'simple'` to `'double'`

Four default value changes across two files. No logic changes.

