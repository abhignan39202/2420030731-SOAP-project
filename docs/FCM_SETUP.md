# Firebase Cloud Messaging setup

FCM delivery is disabled by default. Create a Firebase service account with the Firebase Admin SDK messaging permissions, store its JSON key outside this repository, and configure the Notification Service with:

```text
FCM_ENABLED=true
FIREBASE_PROJECT_ID=<your Firebase project id>
GOOGLE_APPLICATION_CREDENTIALS=<path to the mounted service-account JSON file>
```

For local execution, `GOOGLE_APPLICATION_CREDENTIALS` can point to the local key file. For containers, mount that file read-only into the Notification Service and set the variable to its in-container path. Do not add the key to the project, `.env.example`, or a container image. The repository ignore rules cover common Firebase service-account JSON filenames.

When FCM is disabled, a user has no registered device, or Firebase cannot accept a message, the notification record remains pending or failed as appropriate. The service reports `SENT` only after Firebase returns a message identifier. Register or refresh a signed-in user's device with `POST /api/notifications/devices`; the service derives the owner from the user's JWT.
