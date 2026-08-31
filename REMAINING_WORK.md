# External verification required before production

**Release disposition: V10.1 CORE BLOCKED**, applied to V10.9.1 DEV BASE. This is an implemented development candidate, not a certified production release.

1. **LLM backend:** no real endpoint/credentials were supplied. Context/service/UI are implemented; disconnected/error contract tests pass. Configure a same-origin authenticated service, privacy/retention controls, and run real end-to-end conversations. The local rule coach is not an LLM.
2. **OCR backend:** image selection/preview/manual confirmation are implemented. No provider endpoint was supplied. Actual extraction accuracy and provider response mapping require live testing; never auto-save OCR output.
3. **Payments:** comparison/checkout interface exist; no provider was configured or payment executed. Add webhook verification, server-owned entitlement and authorization. Local `plan` is presentation state, not secure PRO access control.
4. **Firebase:** supplied client config preserved. No real account was used. Check provider enablement, authorized production domains, rules and multi-account behavior with authorized test accounts. Firestore document limits and concurrent-device conflict resolution need backend design; local cache is the safety fallback, not unlimited cloud storage.
5. **Physical iPhone Safari:** desktop Chromium viewport testing does not prove Safari behavior. Check camera capture, software-keyboard safe area, GPS permission and background behavior, notifications, OS share sheet, video codec/MediaRecorder and PWA installation/offline startup on a real iPhone at 320/375/390/430 widths.
6. **Legacy modules:** all remain; unreferenced older routers/features were classified, not activated. Static syntax checks are not runtime certification of dormant versions.
7. **Localization:** application labels and new feature controls are translated; user names, saved plan titles, messages, food/exercise database names and old records remain verbatim. Historical dormant modules retain their old strings. Specialized legacy coaching text should receive bilingual editorial review before release.
8. **Deployment/GitHub:** changes are committed in the local delivery repository, not pushed or deployed to GitHub. The ZIP and supplied Git bundle allow review without overwriting the live repository.

No external API call, payment success, native Safari test or production deployment is claimed by this delivery.
