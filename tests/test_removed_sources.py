#!/usr/bin/env python3
"""Guard: FilmModu, DDiziBox, HDFilmCehennemi are removed everywhere; ÇizgiMax is the only main-manifest source and is unchanged."""
import hashlib, json, os, re, subprocess, unittest
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = re.compile(r"hdfilmcehennemi|filmmodu|ddizibox", re.I)
CIZGI_SHA = "ac8ce12d81bf3cab66bf25a5df97054846909a962fdec6423e1f9fd69caf135c"
def J(n):
    with open(os.path.join(R, n), encoding="utf-8") as f: return json.load(f)
class T(unittest.TestCase):
    def test_main_manifest_only_cizgimax(self):
        s = J("manifest.json")["scrapers"]
        self.assertEqual([x["id"] for x in s], ["cizgimax-wekmed"])
        self.assertIs(s[0]["enabled"], True); self.assertEqual(s[0]["version"], "1.0.8")
    def test_cizgimax_bytes_unchanged(self):
        with open(os.path.join(R, "providers/wekmed/cizgimax.js"), "rb") as f:
            self.assertEqual(hashlib.sha256(f.read()).hexdigest(), CIZGI_SHA)
    def test_no_references_in_tracked_files(self):
        files = subprocess.run(["git", "ls-files"], cwd=R, capture_output=True, text=True, check=True).stdout.split("\n")
        hits = []
        for p in files:
            if not p or p in ("tests/test_removed_sources.py", "README.md"): continue
            if NAMES.search(p): hits.append(p); continue
            try:
                with open(os.path.join(R, p), encoding="utf-8") as f: t = f.read()
            except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError): continue
            if NAMES.search(t): hits.append(p)
        self.assertEqual(hits, [])
if __name__ == "__main__": unittest.main()
