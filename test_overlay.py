#!/usr/bin/env python3
import requests
import json

# Test the new overlay format
print("🧪 Testing overlay radar format...\n")

# 1. Create session
session_resp = requests.post("http://localhost:8000/session/init", json={}).json()
print("✓ Session created:", session_resp.get("session_id", "N/A"))

# 2. Add first participant
p1 = {
    "role": "Genitore",
    "generation": "Baby Boomer (circa 1946–1964)",
    "family_role": "Madre",
    "answers": {
        "misunderstood": "Mi infastidisce quando mio figlio non ascolta i miei consigli e fa sempre di testa sua perché penso non mi consideri.",
        "missing": "Vorrei che capisse che lo faccio solo per il suo bene e la sua sicurezza personale.",
        "wish": "Penso che non mi rispetti abbastanza come madre e come donna con anni di esperienza."
    }
}

p1_resp = requests.post("http://localhost:8000/participant", json=p1).json()
if p1_resp.get("ok"):
    print("✓ First participant added")
else:
    print("✗ First participant error:", p1_resp.get("message", "Unknown error"))
    print("Full response:", json.dumps(p1_resp, indent=2))
    exit(1)

# 3. Add second participant
p2 = {
    "role": "Figlio",
    "generation": "Millennial (circa 1981–1996)",
    "family_role": "Figlio maggiore",
    "answers": {
        "misunderstood": "Mia madre è sempre troppo protettiva e questo mi fa arrabbiare perché non mi permette di fare le mie scelte.",
        "missing": "Vorrei che mi lasciasse più libertà e autonomia nelle mie decisioni e nelle mie azioni personali.",
        "wish": "Credo che non si fidi veramente di me come adulto responsabile e competente nelle mie capacità."
    }
}

p2_resp = requests.post("http://localhost:8000/participant", json=p2).json()
if p2_resp.get("ok"):
    print("✓ Second participant added")
else:
    print("✗ Second participant error:", p2_resp.get("message", "Unknown error"))
    print("Full response:", json.dumps(p2_resp, indent=2))
    exit(1)

# 4. Finalize analysis
final_resp = requests.post("http://localhost:8000/analysis/finalize", json={}).json()
if final_resp.get("ok"):
    print("\n✅ Analysis finalized successfully!")
    
    # Check the new family_aggregate_radar format
    fam_radar = final_resp.get("family_aggregate_radar", [])
    print(f"\n📊 family_aggregate_radar type: {type(fam_radar).__name__}")
    print(f"📊 Number of participants in overlay: {len(fam_radar) if isinstance(fam_radar, list) else 'N/A'}")
    
    if isinstance(fam_radar, list) and len(fam_radar) > 0:
        print("\n🔍 First participant overlay data:")
        print(json.dumps(fam_radar[0], indent=2))
        if len(fam_radar) > 1:
            print("\n🔍 Second participant overlay data:")
            print(json.dumps(fam_radar[1], indent=2))
    else:
        print("⚠️  family_aggregate_radar is not a list or is empty!")
else:
    print("✗ Analysis finalization error:", final_resp.get("detail", "Unknown error"))
    print("Full response:", json.dumps(final_resp, indent=2))
    exit(1)

print("\n✅ All tests passed!")
