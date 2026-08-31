# Caption Studio -> Content360 Bridge

## Decision

Caption Studio and Content360 are complementary, not substitutes.

- **Caption Studio owns intelligence:** media understanding, event context, Baxstar rules, claim discipline, caption creation, sponsor/hashtag/location guidance, and the minimum clarification needed before publishing.
- **Content360 owns commodity distribution:** account connections, queueing, scheduling, multi-platform publishing, analytics, calendar, media library, inbox, link tools, and other marketing utilities.

Caption Studio will not recreate Content360's dashboard, scheduling, analytics, inbox, link-in-bio, QR, chatbot, RSS, or bulk-publishing features.

## Phase 1 pilot — implemented on branch

Branch: `chatgpt/content360-bridge`

Pilot route after merge: `/app/content360/`

The pilot is deliberately non-destructive. It embeds the existing Caption Studio rather than copying or rewriting its production logic, then adds one Content360 handoff bar below it.

The handoff:

1. Reads the exact current `assemble()` output from Caption Studio.
2. Copies that finalized caption.
3. Opens Brady's tested Content360 Create Post composer in a new tab.
4. Shows the remaining posting checklist: media count, sponsor tags, location, and selected timing.
5. Preserves the existing native share-sheet workflow as a separate option inside Caption Studio.

The pilot is not linked from the production app yet and does not alter the current live route. It should be reviewed through its pull request before merge.

## Out of scope for Phase 1

- Content360 API integration or automatic media transfer
- Account authorization
- Automated scheduling
- Analytics import
- Platform-specific caption generation
- Multi-tenant configuration
- Caption Studio SaaS commercialization

Those require evidence from real use or an official Content360 integration surface.

## Verification

Static contract checks live at `.devtest/content360-bridge-static.mjs` and run in GitHub Actions through `.github/workflows/content360-bridge.yml`.

The checks verify that:

- the pilot reuses the current app through a same-origin iframe;
- the exact Caption Studio `assemble()` output is copied;
- the tested Content360 composer URL is used;
- the native share and offline-draft workflows remain present;
- the pilot contains no Anthropic API key;
- the media-transfer limitation is stated accurately.

## Success criteria for pilot acceptance

- One tap copies the caption and opens the correct Content360 composer.
- The copied text is byte-identical to Caption Studio's current assembled output.
- Existing camera, picker, share-sheet, offline queue, sponsor, location, bass-tag, and five-hashtag behaviors remain unchanged.
- GitHub checks pass.
- Brady confirms the mobile handoff saves meaningful time in a real post.

## Future gates

Only consider deeper integration after repeated manual use establishes a real bottleneck and Content360 exposes a supported API, webhook, export, or stable deep-link path.
