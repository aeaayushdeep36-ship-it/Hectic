# Raw research artifacts

Captured 24 Nov 2026. Unprocessed text extractions — kept as an evidence trail, not as reading material. The synthesised version lives in the two numbered files at the project root.

| File | Source | Why kept |
|---|---|---|
| `home.txt` | `ai-agents-founders-hetic-26.devpost.com` | Full brief: deadlines, prizes, judging weights, required submission artefacts, judge names. Re-check exact wording here before writing the submission. |
| `resources.txt` | Hackathon resources page | The sanctioned free-tier tools and models. Anything not on this list is a risk under the Equal Access AI Policy. |
| `foundergate.txt` | Devpost project page, `foundergate-adversarial-mom-test-gtm-discovery-agent` | Full text of the closest competitor submission — feature list, architecture diagram, human-gate mechanics. Read before finalising scope so the differentiation stays honest. |

## Note on Devpost access

`devpost.com` returns 403 to plain fetches. It works with `curl.exe` and a browser User-Agent. `curl` in PowerShell is an alias for `Invoke-WebRequest` and behaves differently — use `curl.exe` explicitly.

```powershell
curl.exe -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" "<url>" -o out.html
```
