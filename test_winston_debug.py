import requests
import json

key = "ayNugAsB2QP033AMfeWfz6qN1z1KQ5EBZFnFxAN9d9d390d2"
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

# Use a definitely plagiarized text (first paragraph of Wikipedia's Python page)
text = "Python is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation. Python is dynamically typed and garbage-collected. It supports multiple programming paradigms, including structured, object-oriented and functional programming."

print("--- Testing Plagiarism API Structure ---")
resp = requests.post("https://api.gowinston.ai/v2/plagiarism", headers=headers, json={"text": text, "language": "en"})
print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    print("Top Level Keys:", data.keys())
    if "result" in data:
        print("Result Keys:", data["result"].keys())
        # Print a sample of indexes or other match data
        for key in ["indexes", "matches", "sentences", "results"]:
            val = data["result"].get(key)
            if val:
                print(f"Found '{key}' (count: {len(val)})")
                print(f"First item in '{key}':", json.dumps(val[0], indent=2)[:500])
    else:
        print("No 'result' key found in data.")
else:
    print(f"Error: {resp.text}")
