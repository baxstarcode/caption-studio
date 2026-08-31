# Caption Studio -> Content360 Bridge

## Decision

Caption Studio and Content360 are complementary, not substitutes.

- **Caption Studio owns intelligence:** media understanding, event context, Baxstar rules, claim discipline, caption creation, sponsor/hashtag/location guidance, and the minimum clarification needed before publishing.
- **Content360 owns commodity distribution:** account connections, queueing, scheduling, multi-platform publishing, analytics, calendar, media library, inbox, link tools, and other marketing utilities.

Caption Studio will not recreate Content360's dashboard, scheduling, analytics, inbox, link-in-bio, QR, chatbot, RSS, or bulk-publishing features.

## Phase 1 build

Add one reliable handoff from the existing Ready-to-post card:

1. Copy the exact finalized Caption Studio caption.
2. Open Brady's Content360 Create Post composer in a new tab.
3. Explain the remaining steps plainly: upload the same media, select accounts and timing, paste the caption, and use native tagging/location fields where supported.
4. Preserve the existing native share-sheet workflow as a separate option.
5. Update the old "auto-scheduling comes later" message so Content360 is explicitly the scheduling/publishing layer.

## Out of scope for Phase 1

- Content360 API integration or automatic media transfer
- Account authorization
- Automated scheduling
- Analytics import
- Platform-specific caption generation
- Multi-tenant configuration
- Caption Studio SaaS commercialization

Those require evidence from real use or an official Content360 integration surface.

## Success criteria

- One tap copies the caption and opens the correct Content360 composer.
- The copied text is byte-identical to Caption Studio's current assembled output.
- Existing camera, picker, share-sheet, offline queue, sponsor, location, bass-tag, and five-hashtag behaviors remain unchanged.
- Browser regression harness remains green.
- Installed PWA users receive the new app shell after the service-worker cache version is bumped.

## Future gates

Only consider deeper integration after repeated manual use establishes a real bottleneck and Content360 exposes a supported API, webhook, export, or stable deep-link path.
