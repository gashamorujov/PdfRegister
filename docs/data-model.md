# Firebase Realtime Database modeli

```text
documents/{documentId}
  id, displayName, safeFileName, phone, courses[]
  status: pending | approved
  telegram: { status, channelId, messageId, fileId, lastError }
  sourceImages[]
  createdAt, approvedAt, updatedAt
samples/{sampleId}
  title, imageUrl, order, createdAt, updatedAt
audit/{auditId}
  action, documentId, actor, createdAt, metadata
settings/samplesIntro
```

Frontend birbaşa Firebase yazmır; bütün yazma əməliyyatları backend tərəfindən autentifikasiya və validasiya ilə edilir. Admin tokeni HTTP-only cookie-dir.
