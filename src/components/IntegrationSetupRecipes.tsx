import { useMemo, useState } from "react";
import TinyTitansIcon from "./TinyTitansIcon";

type RecipeId = "home_assistant" | "esphome" | "mqtt_node_red" | "powershell";

const RECIPE_LABELS: Record<RecipeId, string> = {
  home_assistant: "Home Assistant",
  esphome: "ESPHome",
  mqtt_node_red: "MQTT / Node-RED",
  powershell: "Quick test",
};


export default function IntegrationSetupRecipes({ endpoint, gatewayKey }: { endpoint: string; gatewayKey: string }) {
  const [recipe, setRecipe] = useState<RecipeId>("home_assistant");
  const [copied, setCopied] = useState("");
  const secret = gatewayKey || "YOUR_TINY_TITANS_GATEWAY_KEY";
  const authValue = `Bearer ${secret}`;

  const recipes = useMemo(() => {
    const homeAssistant = `# configuration.yaml
rest_command:
  tiny_titans_telemetry:
    url: "${endpoint}"
    method: post
    headers:
      Authorization: !secret tiny_titans_gateway_auth
    content_type: "application/json"
    payload: >-
      {
        "deviceId": "{{ device_id }}",
        "name": "{{ device_name }}",
        "source": "home_assistant",
        "metrics": {
          "temperatureC": {{ temperature_c | float }},
          "humidityPct": {{ humidity_pct | float }}
        }
      }

# secrets.yaml
tiny_titans_gateway_auth: "${authValue}"

# Example automation action
# Replace the two sensor entity IDs with your own.
automation:
  - alias: "Send vivarium conditions to Tiny Titans"
    triggers:
      - trigger: time_pattern
        minutes: "/5"
    actions:
      - action: rest_command.tiny_titans_telemetry
        data:
          device_id: "vivarium-3-hot-side"
          device_name: "Vivarium 3 hot side"
          temperature_c: "{{ states('sensor.vivarium_temperature') }}"
          humidity_pct: "{{ states('sensor.vivarium_humidity') }}"
`;

    const esphome = `# secrets.yaml
tiny_titans_gateway_auth: "${authValue}"

# Device YAML
http_request:
  timeout: 10s

interval:
  - interval: 5min
    then:
      - http_request.post:
          url: "${endpoint}"
          request_headers:
            Authorization: !secret tiny_titans_gateway_auth
            Content-Type: application/json
          json: |-
            root["deviceId"] = "vivarium-3-hot-side";
            root["name"] = "Vivarium 3 hot side";
            root["source"] = "esphome";
            JsonObject metrics = root["metrics"].to<JsonObject>();
            metrics["temperatureC"] = id(vivarium_temperature).state;
            metrics["humidityPct"] = id(vivarium_humidity).state;

# Replace vivarium_temperature and vivarium_humidity with
# the IDs of your actual ESPHome sensors.
`;

    const nodeRed = `MQTT → Tiny Titans bridge

1. Add an "mqtt in" node and subscribe to your sensor topic.
   Example topic: reptile-room/vivarium-3/state

2. Add a Function node that produces this object:

msg.headers = {
  "Authorization": "${authValue}",
  "Content-Type": "application/json"
};

msg.payload = {
  deviceId: "vivarium-3-hot-side",
  name: "Vivarium 3 hot side",
  source: "mqtt",
  metrics: {
    temperatureC: Number(msg.payload.temperature),
    humidityPct: Number(msg.payload.humidity)
  }
};

return msg;

3. Connect it to an HTTP Request node:
   Method: POST
   URL: ${endpoint}
   Return: parsed JSON object

4. Deploy the flow.

MQTT itself is the local transport. Node-RED (or Home Assistant)
turns the MQTT message into the HTTPS POST Tiny Titans accepts.
`;

    const body = JSON.stringify({
      deviceId: "vivarium-3-hot-side",
      name: "Vivarium 3 hot side",
      source: "custom",
      metrics: { temperatureC: 31.2, humidityPct: 42, heatSourceState: true },
    }, null, 2);
    const powershell = `# Windows PowerShell test
$headers = @{
  Authorization = "${authValue}"
}

$body = @'
${body}
'@

Invoke-RestMethod \`
  -Method Post \`
  -Uri "${endpoint}" \`
  -Headers $headers \`
  -ContentType "application/json" \`
  -Body $body
`;

    return { home_assistant: homeAssistant, esphome, mqtt_node_red: nodeRed, powershell };
  }, [authValue, endpoint]);

  async function copyCurrent() {
    try {
      await navigator.clipboard.writeText(recipes[recipe]);
      setCopied(recipe);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  }

  return <article className="tt-integration-recipes">
    <header>
      <div>
        <span className="tt-integration-kicker">SETUP RECIPES</span>
        <h3><TinyTitansIcon name="link" size={20} /> Connect without another subscription</h3>
        <p>Choose the bridge you already use. The examples post only the fields Tiny Titans accepts and keep the gateway credential on your own controller.</p>
      </div>
      <span className={gatewayKey ? "is-live-key" : "is-placeholder-key"}>{gatewayKey ? "LIVE KEY INSERTED" : "KEY PLACEHOLDER"}</span>
    </header>

    <nav className="tt-integration-recipe-tabs" aria-label="Integration setup recipes">
      {(Object.keys(RECIPE_LABELS) as RecipeId[]).map((id) => <button key={id} type="button" className={recipe === id ? "is-active" : ""} onClick={() => setRecipe(id)}>{RECIPE_LABELS[id]}</button>)}
    </nav>

    <div className="tt-integration-recipe-note">
      <TinyTitansIcon name="lock" size={16} />
      <span>{gatewayKey ? "This snippet contains the newly generated gateway key. Copy it into your own system now; Tiny Titans will not show that raw key again after this page state is lost." : "Generate or rotate a gateway key above to have Tiny Titans insert it into these recipes. Until then, examples use a safe placeholder."}</span>
    </div>

    <div className="tt-integration-recipe-code">
      <button type="button" onClick={() => void copyCurrent()}>{copied === recipe ? "Copied" : "Copy recipe"}</button>
      <pre>{recipes[recipe]}</pre>
    </div>

    {recipe === "home_assistant" && <small>Home Assistant: add the REST command and secret, restart/reload the configuration, then replace the example sensor entity IDs with your own.</small>}
    {recipe === "esphome" && <small>ESPHome: replace the example sensor IDs with your own and keep the gateway token in ESPHome secrets rather than hard-coding it into a shared YAML file.</small>}
    {recipe === "mqtt_node_red" && <small>MQTT is intentionally kept local. Node-RED or Home Assistant acts as the HTTPS bridge to Tiny Titans, so no cloud MQTT service is required.</small>}
    {recipe === "powershell" && <small>The quick test sends a single sample reading so you can confirm the key and endpoint before configuring any hardware.</small>}
  </article>;
}
