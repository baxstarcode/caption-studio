Run one build increment on the Baxstar Caption Studio (proxy architecture).

Every time this command runs:
1. Read BUILD_STATE.md and CLAUDE.md. They are the source of truth for where the build is.
2. Find the first unchecked [ ] step in BUILD_STATE.md that is NOT marked [BRADY].
3. Do that one step. Write COMPLETE files, never snippets. Mirror the baxstar-pontoon repo's proven patterns (Code.gs proxy shape, mock harness, deploy runbook).
4. Update BUILD_STATE.md: mark the step [x], add a one-line result, and add anything Brady must decide/provide under "OPEN QUESTIONS FOR BRADY".
5. Commit with a clear message.
6. Report in under 8 lines: what you did, the next unchecked step, any single open question. Then stop.

Rules: one increment per run. Never touch a [BRADY] step. If only [BRADY]/blocked steps remain, say so and stop. The Anthropic key lives ONLY in Apps Script Script Properties — never in the repo, never never in the HTML.
