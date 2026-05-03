import requests
import json
import time

key = "WQsW8ehpnKHg0X8lO9286O84BHj3zHV6vfEQx68p950ff56a"
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

text = "Python is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation. Python is dynamically typed and garbage-collected. It supports multiple programming paradigms, including structured, object-oriented and functional programming. It is often described as a 'batteries included' language due to its comprehensive standard library."

print("--- AI Detect ---")
ai = requests.post("https://api.gowinston.ai/v2/ai-content-detection", headers=headers, json={"text": text, "sentences": True, "language": "en"})
print(ai.status_code, ai.text[:500])

print("\n--- Plagiarism ---")
plag = requests.post("https://api.gowinston.ai/v2/plagiarism", headers=headers, json={"text": text, "language": "en"})
print(plag.status_code, plag.text[:500])
