# Tiny Titans free integration platform

Tiny Titans uses a zero-cost-first integration policy. Optional paid APIs, metered SaaS connectors and services that can create an external usage bill are disabled by design.

## Device Gateway

Public endpoint:

`https://tinytitanskeeper.web.app/api/device-gateway`

A signed-in keeper generates a `ttdg_` gateway key from **Settings → Integrations → Integration Hub**. The raw key is displayed once. Tiny Titans persists only its SHA-256 digest.

Send telemetry with:

`Authorization: Bearer ttdg_...`

Example:

```json
{
  "deviceId": "vivarium-3-hot-side",
  "name": "Vivarium 3 hot side",
  "source": "home_assistant",
  "animalId": "optional-animal-id",
  "enclosureId": "optional-enclosure-id",
  "metrics": {
    "temperatureC": 31.2,
    "humidityPct": 42,
    "heatSourceState": true
  },
  "timestamp": "2026-10-04T09:30:00Z"
}
```

Supported sources: `home_assistant`, `mqtt`, `esphome`, `node_red`, `custom`.

Supported metrics: `temperatureC`, `humidityPct`, `batteryPct`, `powerW`, `lightLux`, `co2Ppm`, `pressureHpa`, `waterLevelPct`, `switchState`, `heatSourceState`, `lightState`, `fanState`.

The gateway is intentionally write-only. Devices cannot read animal records.

## Calendar

The Integration Hub exports active reminders as an ICS file. This requires no Google Calendar API or paid calendar provider.

## Security

- Gateway keys are high-entropy and revocable.
- Generating a replacement key revokes the previous one.
- Payload size is capped.
- Device IDs, source type, timestamp and metric ranges are validated server-side.
- Telemetry and credential collections remain backend-managed.
- No device receives generic Firestore access.

## Deployment

After pulling the commit:

```powershell
npm run validate:integration-hub
npm run build
firebase deploy --only "functions:getIntegrationHubStatus,functions:createIntegrationGatewayKey,functions:revokeIntegrationGatewayKey,functions:getIntegrationTelemetry,functions:getIntegrationAutomationRules,functions:saveIntegrationAutomationRule,functions:deleteIntegrationAutomationRule,functions:deviceGatewayIngest,hosting:keeper"
```

## Titan Automations

The Integration Hub includes free notification-only environment rules. A keeper can target one connected device or all devices, choose a numeric metric, set a greater-than/less-than threshold and a notification cooldown. Rules create an in-app event and use the existing Firebase push channel when enabled.

Tiny Titans does not actuate heaters, thermostats, lights, fans or other enclosure equipment. Control stays with the dedicated thermostat/controller or the keeper's Home Assistant installation.
