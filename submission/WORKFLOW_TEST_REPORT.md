# ResQMap AI workflow test report

Tested in two fresh browser sessions without refreshing during either journey.

## Journey verified

Hazard detected → source and timestamp shown → citizen alert opened → Kiswahili and Somali selected → voice control activated → unsafe translation blocked with four reasons → citizen report submitted → same report received by authority → report verified → alert escalated → network failure simulated → last verified warning retained → two reports queued → connection restored → queued reports synchronised.

## Problems discovered and fixed

1. **Citizen-alert button opened the wrong step.** It restarted at hazard detection. It now opens the citizen alert directly.
2. **Language buttons were inactive.** English, Kiswahili and Somali now change the displayed warning.
3. **Voice did not follow the selected language.** Playback now uses the selected message and language code.
4. **Citizen report was only visual.** Submission now creates shared session state and the same incident ID appears in the authority view.
5. **Authority workflow advanced automatically.** Verification and escalation now require explicit judge-controlled actions.
6. **Offline state was not visible system-wide.** A persistent banner now shows cached-warning and queued-report status.
7. **Hydration mismatch occurred because dates and benchmark timing differed between server and browser.** Displayed timestamps and benchmark labels are now deterministic.
8. **Demo controls could fall below a short viewport.** Modal height and content layout were tightened so controls remain reachable.

## Final result

- First repaired journey: passed
- Second repaired journey: passed
- Browser console errors on final run: 0
- Page refreshes during each journey: 0

