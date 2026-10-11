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

Backend Firebase Admin SDK ilə sənəd metadata-sını Realtime Database-də saxlayır. Admin brauzeri HTTP-only sessiya ilə qorunan server endpoint-inə bağlanır; backend RTDB listener hadisələrini server-sent events ilə göndərir. Brauzer birbaşa database-ə yazmır. Admin service-account private key yalnız hosting-in secret manager-ində saxlanmalıdır.