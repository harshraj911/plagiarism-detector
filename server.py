#!/usr/bin/env python3
"""
PlagiScan — Professional Plagiarism & AI Detection Backend
===========================================================
HYBRID VERSION: Dynamic Keys + Credit Protection + Logic Fix 🛡️
"""

import os
import uuid
import json
import threading
import time
import requests as http_requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from docx import Document
import PyPDF2
import io
import re

# ── Flask App Initialization ──────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── Configuration ─────────────────────────────────────────────────────────────
DEFAULT_WINSTON_KEY = os.environ.get("WINSTON_API_KEY", "")
DEFAULT_GROQ_KEY = os.environ.get("GROQ_API_KEY", "")

WINSTON_PLAGIARISM_URL = "https://api.gowinston.ai/v2/plagiarism"
WINSTON_AI_DETECT_URL  = "https://api.gowinston.ai/v2/ai-content-detection"

PORT = 5050

# ── State & Protection ────────────────────────────────────────────────────────
_scans = {}
_lock = threading.Lock()
_last_scan_time = 0

# ── Helper Functions ──────────────────────────────────────────────────────────

def _get_fallback_tips(ai_score, plag_score):
    tips = []
    if ai_score > 30:
        tips.append({"icon": "🤖", "color": "blue", "title": "Significant AI Content Detected", "body": "Most of this text appears AI-generated. Consider completely rewriting it in your own distinct voice.", "example": "Step 1: Read the draft -> Step 2: Close it -> Step 3: Rewrite from memory."})
    if plag_score > 15:
        tips.append({"icon": "✍️", "color": "violet", "title": "Paraphrase Flagged Sections", "body": "Rewrite highlighted sections using completely unique vocabulary and citation.", "example": "Change sentence structure entirely."})
    tips.append({"icon": "🧠", "color": "cyan", "title": "Add Your Perspective", "body": "Original thought is the best way to ensure uniqueness.", "example": "After presenting a fact, add 'This matters because…' with your analysis."})
    return tips

def _get_contextual_rewrite(sentence: str, groq_key: str, is_plagiarism: bool = False) -> str:
    key = groq_key or DEFAULT_GROQ_KEY
    if not key: return "💡 Suggestion: Rephrase manually."
    try:
        prompt = f"Rewrite this {'plagiarized' if is_plagiarism else 'AI-generated'} sentence to sound completely like a natural human wrote it. Return ONLY the rewritten sentence. Sentence: '{sentence}'"
        resp = http_requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": prompt}], "max_tokens": 60, "temperature": 0.5},
            timeout=5
        )
        if resp.status_code == 200:
            return "💡 AI Rewrite: " + resp.json()['choices'][0]['message']['content'].strip()
    except: pass
    return "💡 Suggestion: Rewrite this part completely."

def _run_full_scan(scan_id, text, winston_key, groq_key):
    w_key = winston_key or DEFAULT_WINSTON_KEY
    key_source = "DYNAMIC (UI)" if winston_key else "HARDCODED (DEFAULT)"
    print(f"DEBUG [{scan_id}]: Using Winston Key source: {key_source} (Ends with: ...{w_key[-4:] if w_key else 'None'})")
    
    headers = {"Authorization": f"Bearer {w_key}", "Content-Type": "application/json"}
    errors = []
    ai_result = {"score": 0, "ai_score": 0, "sentences": []}
    plagiarism_result = {"score": 0, "sentences": []}

    # 1. AI Detection
    try:
        print(f"DEBUG [{scan_id}]: Starting AI Content scan...")
        resp = http_requests.post(WINSTON_AI_DETECT_URL, headers=headers, json={"text": text, "sentences": True, "language": "en"}, timeout=60)
        print(f"DEBUG [{scan_id}]: AI Resp: {resp.status_code} - {resp.text[:150]}")
        
        if resp.status_code == 200:
            data = resp.json()
            res_obj = data.get("result", data)
            score = res_obj.get("score", data.get("score", 0))
            if score < 1.1: score *= 100
            sentences = res_obj.get("sentences", data.get("sentences", []))
            for s in sentences:
                s_sc = s.get("score", 0)
                if s_sc < 1.1: s_sc *= 100
                s["score"] = s_sc
                if (100 - s_sc) > 15: s["rewrite_suggestion"] = _get_contextual_rewrite(s.get("text", ""), groq_key)
            ai_result = {"score": score, "ai_score": 100 - score, "sentences": sentences}
        elif resp.status_code in [402, 403]:
            errors.append("AI Detection Error: Insufficient Credits on Winston AI account.")
            ai_result = None
        else:
            errors.append(f"AI API Error ({resp.status_code}): {resp.text[:100]}")
            ai_result = None
    except Exception as e:
        errors.append(f"AI Connection Exception: {str(e)}")
        ai_result = None

    # 2. Plagiarism
    try:
        print(f"DEBUG [{scan_id}]: Starting Plagiarism scan...")
        resp = http_requests.post(WINSTON_PLAGIARISM_URL, headers=headers, json={"text": text, "language": "en"}, timeout=120)
        print(f"DEBUG [{scan_id}]: Plag Resp: {resp.status_code} - {resp.text[:150]}")
        
        if resp.status_code == 200:
            data = resp.json()
            # Exhaustive discovery of results
            res_obj = data.get("result", {})
            if not res_obj and "score" in data: res_obj = data # Fallback
            
            p_score = data.get("score")
            if p_score is None: p_score = res_obj.get("score", 0)
            
            # Key discovery for matches and sources
            # Winston v2 uses 'indexes' and 'sources' inside 'result'
            # Some variants use 'matches' or 'results'
            indexes = res_obj.get("indexes", []) or data.get("indexes", []) or res_obj.get("matches", []) or data.get("matches", [])
            sources = res_obj.get("sources", []) or data.get("sources", []) or res_obj.get("results", []) or data.get("results", [])
            
            print(f"DEBUG [{scan_id}]: Plagiarism keys found: res_obj_keys={list(res_obj.keys())}, indexes_count={len(indexes)}, sources_count={len(sources)}")
            
            # Logic Fix: If sources found but score is 0, estimate score so user see results
            source_count = len(sources) or res_obj.get("sourceCounts", 0)
            if p_score == 0 and source_count > 0:
                p_score = min(source_count * 5, 95)
            
            if 0 < p_score < 1.1: p_score *= 100
            
            def _normalize(t):
                return ' '.join(t.lower().split())

            raw_sents = re.split(r'(?<=[.!?])\s+', text)
            syn_sents = []
            for s_text in raw_sents:
                if not s_text.strip(): continue
                s_score = 0
                s_url = ""
                s_source_title = ""
                
                clean_s = _normalize(s_text)
                if not clean_s: continue

                # Strategy 1: Look in 'indexes' or 'matches'
                # These usually have 'text' and 'sourceId'
                for idx in indexes:
                    idx_text = idx.get("text", "") or idx.get("fragment", "") or idx.get("matching_text", "")
                    clean_idx = _normalize(idx_text)
                    if not clean_idx: continue
                    
                    if clean_idx in clean_s or clean_s in clean_idx:
                        s_score = 100
                        sid = idx.get("sourceId", idx.get("source_id", 0))
                        if 0 <= sid < len(sources): 
                            s_url = sources[sid].get("url", sources[sid].get("link", ""))
                            s_source_title = sources[sid].get("title", sources[sid].get("name", ""))
                        break
                
                # Strategy 2: High Confidence Fallback
                # If we have a very high plagiarism score (>80%) but no specific match for this sentence,
                # it's likely that the entire document is a match and granular indexing is just missing.
                if s_score == 0 and p_score > 80 and len(sources) > 0:
                    s_score = p_score # Match the overall intensity
                    # Map to the first source as a primary reference
                    s_url = sources[0].get("url", sources[0].get("link", ""))
                    s_source_title = sources[0].get("title", sources[0].get("name", "Global Repository"))

                syn_sents.append({
                    "text": s_text, 
                    "score": s_score, 
                    "source_url": s_url, 
                    "source_title": s_source_title,
                    "rewrite_suggestion": _get_contextual_rewrite(s_text, groq_key, True) if (s_score > 10 or (p_score > 50 and s_score == 0)) else None
                })
            
            # Create a summary of unique sources
            unique_sources = []
            seen_urls = set()
            for src in sources:
                url = src.get("url", src.get("link"))
                if url and url not in seen_urls:
                    unique_sources.append({"url": url, "title": src.get("title", src.get("name", "Internet Source"))})
                    seen_urls.add(url)

            plagiarism_result = {
                "score": p_score, 
                "sentences": syn_sents,
                "sources": unique_sources
            }
        elif resp.status_code in [402, 403]:
            errors.append("Plagiarism Error: Insufficient Credits or Trial Limit reached.")
            plagiarism_result = None
        else:
            errors.append(f"Plagiarism API Error ({resp.status_code})")
            plagiarism_result = None
    except Exception as e:
        errors.append(f"Plagiarism Exception: {str(e)}")
        plagiarism_result = None

    with _lock:
        if scan_id in _scans:
            # Signal Error status if both core engines failed
            status = "complete" if (ai_result is not None or plagiarism_result is not None) else "error"
            _scans[scan_id].update({
                "status": status,
                "progress": 100,
                "plagiarism": plagiarism_result or {"score": 0, "sentences": [], "error": True},
                "ai_detection": ai_result or {"score": 0, "ai_score": 0, "sentences": [], "error": True},
                "actionable_tips": _get_fallback_tips(ai_result["ai_score"] if ai_result else 0, plagiarism_result["score"] if plagiarism_result else 0),
                "error": " | ".join(errors) if errors else None
            })

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.route('/api/scan', methods=['POST'])
def scan_content():
    global _last_scan_time
    now = time.time()
    # Your Credit Protection Cooldown (5 Seconds)
    if now - _last_scan_time < 5:
        return jsonify({"error": "System cooling down. Please wait 5 seconds between scans."}), 429
    
    _last_scan_time = now
    data = request.get_json(force=True)
    text = (data.get('text', '')).strip()
    winston_key = data.get('winston_key')
    groq_key = data.get('groq_key')

    if not text or len(text.split()) < 10:
        return jsonify({"error": "Minimum 10 words required."}), 400
    
    scan_id = uuid.uuid4().hex
    with _lock:
        _scans[scan_id] = {"id": scan_id, "status": "processing", "progress": 10}
    
    thread = threading.Thread(target=_run_full_scan, args=(scan_id, text, winston_key, groq_key))
    thread.daemon = True
    thread.start()
    return jsonify({"scan_id": scan_id})

@app.route('/api/status/<scan_id>', methods=['GET'])
def get_status(scan_id):
    with _lock:
        scan = _scans.get(scan_id)
        if not scan: return jsonify({"error": "Scan not found"}), 404
        return jsonify(scan)

@app.route('/api/extract-text', methods=['POST'])
def extract_text():
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    filename = file.filename.lower()
    try:
        text = ""
        if filename.endswith('.pdf'):
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages: text += page.extract_text() + "\n"
        elif filename.endswith('.docx'):
            doc = Document(file)
            for para in doc.paragraphs: text += para.text + "\n"
        else: text = file.read().decode('utf-8', errors='ignore')
        return jsonify({"text": text.strip()})
    except Exception as e: return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print(f"\n✅  PlagiScan Core → http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)